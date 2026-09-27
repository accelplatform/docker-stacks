// IM-Juggling プロジェクトから war / 静的ファイルをビルドする。
//
// 1. JugglingProject を開く
// 2. additional-modules 配下のユーザモジュールをプロジェクトへ反映して保存する (同一モジュール ID があれば差し替え)
// 3. 構成を検証する (validate / build.plan)
// 4. war を生成し、展開先へ overwrite ディレクトリを上書きしてから war を作り直す
// 5. 静的ファイル (static-zip) を生成し、展開する
//
// 2 でプロジェクトを書き換えるため、3 以降で失敗した場合は 2 の実行前の状態へ戻す。
//
// 生成物 (既定値):
//   /data/war        exploded war      … Resin が直接参照する
//   /data/imart.war  war アーカイブ
//   /data/public     静的ファイル      … Apache HTTPd が直接参照する
//   /data/imart.zip  静的ファイルの zip

import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve, sep } from "node:path";
import { createJuggling } from "@intra-mart/juggling-core";
import { createImuiScriptPort } from "@intra-mart/juggling-core/build";

const MANIFEST_ENTRY = "META-INF/MANIFEST.MF";

// 選択可能な値と、ログ表示に使うラベル (IM-Juggling の英語表記に合わせる)
const TEMPLATE_LABELS = {
	resin40: "Resin 4.0",
	payara5: "Payara 5",
	weblogic12c: "WebLogic Server 12c",
	was80: "WebSphere Application Server 8.0",
};
const ENVIRONMENT_LABELS = {
	ut: "Unit test environment",
	si: "Combination test environment",
	pt: "Integrated test environment",
	product: "Production environment",
};
const LICENSE_TYPE_LABELS = {
	product: "Product",
	trial: "Evaluation",
};

function text(name, fallback) {
	const value = process.env[name];
	return value === undefined || value.trim() === "" ? fallback : value.trim();
}

function flag(name, fallback) {
	const value = process.env[name];
	if (value === undefined || value.trim() === "") return fallback;
	const normalized = value.trim().toLowerCase();
	if (["true", "1", "yes", "on"].includes(normalized)) return true;
	if (["false", "0", "no", "off"].includes(normalized)) return false;
	throw new Error(`${name} must be true or false, but was: ${value}`);
}

function choice(name, fallback, allowed) {
	const value = text(name, fallback);
	if (!allowed.includes(value)) {
		throw new Error(`${name} must be one of ${allowed.join(" / ")}, but was: ${value}`);
	}
	return value;
}

// 出力先ファイルパスを exportWar / exportStatic のオプション形式 (拡張子なし) に分解する。
function splitArtifactPath(path, extension) {
	const name = basename(path);
	const fileName = name.endsWith(extension) ? name.slice(0, -extension.length) : name;
	return { destDir: dirname(path), fileName };
}

function loadConfig() {
	const warFile = text("JUGGLING_WAR", "/data/imart.war");
	const staticFile = text("JUGGLING_STATIC", "/data/imart.zip");
	return {
		projectDir: text("JUGGLING_PROJECT", "/data/project"),
		additionalModulesDir: text("JUGGLING_ADDITIONAL_MODULES", "/data/additional-modules"),
		managedRepositoryPath: text("JUGGLING_WORK", "/data/repository"),
		overwriteDir: text("JUGGLING_OVERWRITE", "/app/overwrite"),
		warDir: text("JUGGLING_DEST", "/data/war"),
		staticDir: text("JUGGLING_DEST_STATIC", "/data/public"),
		warFile,
		staticFile,
		war: splitArtifactPath(warFile, ".war"),
		static: splitArtifactPath(staticFile, ".zip"),
		template: choice("JUGGLING_TEMPLATE", "resin40", Object.keys(TEMPLATE_LABELS)),
		allowValidationNg: flag("JUGGLING_ALLOW_VALIDATION_NG", false),
		repositories: [
			{
				name: "base",
				location: text("JUGGLING_REPOSITORY_BASE", "http://repository.intra-mart.jp/base"),
				sort: 0,
				description: "",
				erasable: true,
				available: true,
			},
			{
				name: "app",
				location: text("JUGGLING_REPOSITORY_APP", "http://repository.intra-mart.jp/app"),
				sort: 1,
				description: "",
				erasable: true,
				available: true,
			},
		],
		inputs: {
			licenseType: flag("JUGGLING_TRIAL", false) ? "trial" : "product",
			environment: choice("JUGGLING_ENV", "ut", Object.keys(ENVIRONMENT_LABELS)),
			includeSamples: flag("JUGGLING_SAMPLE", true),
		},
	};
}

// zip エントリ名を展開先ディレクトリ配下の絶対パスへ解決する (zip slip 対策付き)。
function resolveEntryPath(destDir, entryName) {
	const root = resolve(destDir);
	const target = resolve(root, entryName);
	if (target !== root && !target.startsWith(`${root}${sep}`)) {
		throw new Error(`zip entry escapes the destination directory: ${entryName}`);
	}
	return target;
}

async function extractArchive(zip, archivePath, destDir) {
	const reader = await zip.open(archivePath, "UTF-8");
	try {
		for (const entryName of reader.entryNames()) {
			const target = resolveEntryPath(destDir, entryName);
			if (entryName.endsWith("/")) {
				await mkdir(target, { recursive: true });
				continue;
			}
			await mkdir(dirname(target), { recursive: true });
			await writeFile(target, await reader.read(entryName));
		}
		return reader.entryNames().length;
	} finally {
		await reader.close();
	}
}

async function collectEntries(root) {
	const entries = [];
	const walk = async (dir, prefix) => {
		const dirents = await readdir(dir, { withFileTypes: true });
		dirents.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
		for (const dirent of dirents) {
			const path = join(dir, dirent.name);
			const name = `${prefix}${dirent.name}`;
			if (dirent.isDirectory()) {
				entries.push({ name: `${name}/`, path, directory: true });
				await walk(path, `${name}/`);
			} else if (dirent.isFile()) {
				entries.push({ name, path, directory: false });
			} else {
				console.warn(`  [warn] skipped (not a regular file): ${path}`);
			}
		}
	};
	await walk(root, "");
	return entries;
}

async function createArchive(zip, srcDir, destFile) {
	const entries = await collectEntries(srcDir);
	// JarInputStream がマニフェストを読み取れるよう先頭に配置する。
	const manifestIndex = entries.findIndex((e) => e.name === MANIFEST_ENTRY);
	if (manifestIndex > 0) entries.unshift(...entries.splice(manifestIndex, 1));

	await mkdir(dirname(destFile), { recursive: true });
	const writer = zip.createWriter(destFile, "UTF-8");
	for (const entry of entries) {
		if (entry.directory) writer.add(entry.name);
		else writer.add(entry.name, new Uint8Array(await readFile(entry.path)));
	}
	await writer.finalize();
	return entries.length;
}

// additional-modules ディレクトリに置かれたユーザモジュール (imm) の一覧を取得する。
async function listAdditionalModules(dir) {
	let dirents;
	try {
		dirents = await readdir(dir, { withFileTypes: true });
	} catch (cause) {
		if (cause.code === "ENOENT") return [];
		throw cause;
	}
	return dirents
		.filter((dirent) => dirent.isFile() && /\.(imm|zip)$/i.test(dirent.name))
		.map((dirent) => dirent.name)
		.sort()
		.map((name) => join(dir, name));
}

// ユーザモジュールの反映はプロジェクト配下の modules/ と juggling.im を直接書き換え、
// 差し替え時には元の imm ファイルが失われる (juggling.im の履歴にも残らない) ため、
// 失敗時に戻せるようプロジェクトを退避しておく。
// 復元に失敗した場合は手作業で戻せるよう、退避先はコンテナ内ではなくプロジェクトと同じ場所 (マウント先) に作る。
async function backupProject(projectDir) {
	const backupDir = join(dirname(projectDir), ".project-backup");
	await rm(backupDir, { recursive: true, force: true });
	await cp(projectDir, backupDir, { recursive: true });
	return backupDir;
}

// 退避したプロジェクトで JUGGLING_PROJECT を復元する (マウントポイントを消さないよう中身のみ入れ替える)。
async function restoreProject(backupDir, projectDir) {
	for (const name of await readdir(projectDir)) {
		await rm(join(projectDir, name), { recursive: true, force: true });
	}
	await cp(backupDir, projectDir, { recursive: true });
}

// プロジェクトが持つユーザモジュールをログ用の文字列にする。
function formatUserModules(structure) {
	const userModules = structure.getUserModules();
	if (userModules.length === 0) return "(none)";
	return userModules.map((m) => `${m.getId()} ${m.getVersion()}`).join(", ");
}

// imm ファイルからモジュール ID とバージョンを読み取る。
async function readModuleKey(juggling, path) {
	try {
		const module = await juggling.moduleService.convertModule(path);
		return { id: String(module.id), version: module.version.toString() };
	} catch (cause) {
		throw new Error(`failed to read user module: ${path}: ${cause.message}`, { cause });
	}
}

// addUserModules / replaceUserModule の失敗内容 (例外ではなく戻り値で返る) をメッセージに変換する。
function describeUserModuleResult(path, result) {
	switch (result.kind) {
		case "rejected": {
			const detail = result.finding.detail === undefined ? "" : ` ${result.finding.detail}`;
			return `${path}: ${result.finding.ruleId} - ${result.finding.message}${detail}`;
		}
		case "rolled-back":
			return `${path}: rolled back - ${result.rejected.messages}`;
		case "aborted":
			return `${path}: aborted - ${result.error.message}`;
		default:
			return `${path}: ${result.kind}`;
	}
}

// additional-modules のユーザモジュールをプロジェクトへ反映する。
// 同一モジュール ID のユーザモジュールが既にあれば差し替え (バージョン違いも含む)、なければ追加する。
async function applyAdditionalModules(juggling, project, paths) {
	for (const path of paths) {
		const { id, version } = await readModuleKey(juggling, path);
		const existing = project.structure.getUserModules().find((m) => m.getId() === id);
		let result;
		if (existing === undefined) {
			// リポジトリから取得するモジュールと ID が重複する場合、ユーザモジュールとしては追加できない。
			const conflict = project.structure.listContainerModules().find((m) => m.getId() === id);
			if (conflict !== undefined) {
				throw new Error(
					`${basename(path)}: module id ${id} is already provided by the project (${conflict.getVersion()}); remove it from the project or from ${dirname(path)}`,
				);
			}
			console.log(`  add     ${id} ${version} (${basename(path)})`);
			result = await project.addUserModules([path]);
		} else {
			console.log(`  replace ${id} ${existing.getVersion()} -> ${version} (${basename(existing.getPath())} -> ${basename(path)})`);
			result = await project.replaceUserModule(existing, path);
		}
		if (result.kind !== "completed") {
			throw new Error(`failed to apply user module: ${describeUserModuleResult(path, result)}`);
		}
	}
}

function reportValidation(status) {
	console.log(`  severity: ${status.severity}`);
	for (const finding of status.flatten()) {
		console.log(`  ${finding.severity} ${finding.kind} ${finding.ruleId} - ${finding.message}`);
	}
}

function reportPlan(plan) {
	console.log(`  blockers=${plan.blockers.length} warnings=${plan.warnings.length}`);
	for (const finding of [...plan.blockers, ...plan.warnings]) {
		console.log(`  ${finding.kind} - ${finding.message}`);
	}
}

function buildListeners(label) {
	return {
		onProgress: (e) => console.log(`  [${label}] ${e.phase}`),
		onLog: (e) => {
			if (e.level === "conflict") console.log(`  [${label}] conflict: ${e.message}`);
		},
	};
}

async function main() {
	const config = loadConfig();
	const additionalModules = await listAdditionalModules(config.additionalModulesDir);

	console.log("=== Configuration ===");
	console.log(`  project             : ${config.projectDir}`);
	console.log(`  additional modules  : ${additionalModules.length === 0 ? "(none)" : additionalModules.map((path) => basename(path)).join(", ")}`);
	console.log(`  local repository    : ${config.managedRepositoryPath}`);
	console.log(`  application server  : ${TEMPLATE_LABELS[config.template]} (${config.template})`);
	console.log(`  environment         : ${ENVIRONMENT_LABELS[config.inputs.environment]} (${config.inputs.environment})`);
	console.log(`  license type        : ${LICENSE_TYPE_LABELS[config.inputs.licenseType]} (${config.inputs.licenseType})`);
	console.log(`  samples             : ${config.inputs.includeSamples ? "included" : "excluded"}`);

	console.log("=== Cleaning artifacts ===");
	for (const path of [config.warDir, config.staticDir, config.warFile, config.staticFile]) {
		await rm(path, { recursive: true, force: true });
	}

	// juggling のメッセージは juggling.im 側のロケールに従う。
	// 既存プロジェクトを開くだけの本スクリプトではロケールを変更できないが、省略するとコンテナの環境ロケールに依存するため固定しておく。
	const juggling = await createJuggling({
		managedRepositoryPath: config.managedRepositoryPath,
		locale: "ja",
		repositories: config.repositories,
	});

	// ユーザモジュールの反映前のプロジェクト (退避先)。反映を行わない場合は null。
	let backupDir = null;
	let keepBackup = false;

	try {
		console.log("=== Opening project ===");
		const project = await juggling.projects.open(config.projectDir);
		const base = project.latest.getBase();
		console.log(`  base : ${String(base?.key().id)} ${base?.key().version.toString()}`);
		console.log(`  apps : ${project.latest.getApplications().map((p) => String(p.key().id)).join(", ")}`);
		console.log(`  user modules : ${formatUserModules(project.latest)}`);

		if (additionalModules.length > 0) {
			console.log("=== Applying additional modules ===");
			backupDir = await backupProject(config.projectDir);
			console.log(`  backup : ${backupDir}`);
			await applyAdditionalModules(juggling, project, additionalModules);
			// 付け外しの時点でプロジェクト配下の modules/ は書き換わっているため、検証結果によらず juggling.im も保存して整合させる。
			// war / 静的ファイルは保存済みの構成 (project.latest) からビルドされる。
			const saved = await project.save({ description: "additional-modules applied by juggling-build-war" });
			console.log(`  saved : ${saved.transition.kind} (${saved.status.severity})`);
			console.log(`  user modules : ${formatUserModules(project.latest)}`);
		}

		console.log("=== Validating project ===");
		const status = await project.validate();
		reportValidation(status);
		if (status.isNg() && !config.allowValidationNg) {
			throw new Error(
				"project validation reported NG; fix the module structure or set JUGGLING_ALLOW_VALIDATION_NG=true",
			);
		}

		console.log("=== Pre-build validation ===");
		const plan = await juggling.build.plan(project, { template: config.template, inputs: config.inputs });
		reportPlan(plan);
		if (plan.blockers.length > 0) {
			throw new Error("pre-build validation reported blockers; aborting");
		}

		console.log("=== Building war ===");
		const warResult = await juggling.build.exportWar(project, {
			template: config.template,
			inputs: config.inputs,
			destDir: config.war.destDir,
			fileName: config.war.fileName,
			// im_ui など外部スクリプトを持つモジュールのビルドに必要
			externalScripts: createImuiScriptPort({ fs: juggling.context.runtime.fs }),
			...buildListeners("war"),
		});
		console.log(`  ${warResult.artifactPath} (entries=${warResult.entryNames.length}, modules=${warResult.extractedModules.length})`);

		console.log(`=== Extracting war into ${config.warDir} ===`);
		const zip = juggling.context.runtime.zip;
		console.log(`  ${await extractArchive(zip, warResult.artifactPath, config.warDir)} entries`);

		console.log(`=== Applying ${config.overwriteDir} to ${config.warDir}/WEB-INF ===`);
		const overwritten = await overlayOverwrite(config.overwriteDir, join(config.warDir, "WEB-INF"));
		console.log(`  ${overwritten} files`);

		console.log(`=== Repackaging ${config.warFile} ===`);
		console.log(`  ${await createArchive(zip, config.warDir, config.warFile)} entries`);

		console.log("=== Building static files ===");
		const staticResult = await juggling.build.exportStatic(project, {
			template: "static",
			inputs: config.inputs,
			destDir: config.static.destDir,
			fileName: config.static.fileName,
			...buildListeners("static"),
		});
		console.log(`  ${staticResult.artifactPath} (entries=${staticResult.entryNames.length}, modules=${staticResult.extractedModules.length})`);

		console.log(`=== Extracting static files into ${config.staticDir} ===`);
		console.log(`  ${await extractArchive(zip, staticResult.artifactPath, config.staticDir)} entries`);

		console.log("=== Done ===");
	} catch (error) {
		// 検証 NG やビルド失敗でプロジェクトにユーザモジュールが取り込まれたままになるのを防ぐ。
		if (backupDir !== null) {
			console.error("");
			console.error("**********************************************************************");
			console.error("*** The build failed after additional modules had been applied.");
			console.error(`*** Restoring the project: ${config.projectDir}`);
			try {
				await restoreProject(backupDir, config.projectDir);
				console.error("*** RESTORED the project to the state before additional modules were applied.");
				console.error("*** No user module in additional-modules has been applied to the project.");
			} catch (cause) {
				keepBackup = true;
				console.error(`*** FAILED TO RESTORE the project: ${cause.message}`);
				console.error(`*** Restore it manually from the backup: ${backupDir}`);
			}
			console.error("**********************************************************************");
			console.error("");
		}
		throw error;
	} finally {
		// 復元できなかった場合のみ、手作業で戻せるよう退避を残す。
		if (backupDir !== null && !keepBackup) await rm(backupDir, { recursive: true, force: true });
		await juggling.repositories.close();
	}
}

// overwrite ディレクトリの内容を WEB-INF へ上書きコピーする (ant 版の `cp -rv overwrite/* WEB-INF/` 相当)。
async function overlayOverwrite(srcDir, destDir) {
	const entries = await collectEntries(srcDir);
	let copied = 0;
	for (const entry of entries) {
		const target = join(destDir, entry.name);
		if (entry.directory) {
			await mkdir(target, { recursive: true });
		} else {
			await mkdir(dirname(target), { recursive: true });
			await writeFile(target, await readFile(entry.path));
			copied += 1;
		}
	}
	return copied;
}

await main();
