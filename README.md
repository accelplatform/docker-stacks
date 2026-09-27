# Accel Platform Docker stacks

## 概要

Docker を利用した Accel Platform を動作させるためのスタンドアロン構成を提供します。  
ビルドを行い war ファイルや静的ファイルを生成する事ができます。JDK のインストール等も不要です。  
`mailpit`を組み込んでいる為、メール送信の確認が容易に行えます。

## 構成とバージョン

Accel Platform Docker stacks は、初期設定の状態で下記バージョンの環境を構築します。

- intra-mart Accel Platform Professional Edition 2026 Autumn
  - IM-FormaDesigner 8.0.39
  - IM-BIS 8.0.37
  - IM-BloomMaker 8.0.17
  - Accel Studio 8.0.10
  - IM-BPM 8.0.21
  - Accel Orbit 8.0.0
  - モジュール開発支援ライブラリ・標準デバッガ 8.0.4
- PostgreSQL 18

## 前提条件

- カスタマーサクセスライセンスを有していること
  - [intra-mart Accel Platform セットアップガイド - ライセンスについて](https://document.intra-mart.jp/library/iap/public/setup/iap_setup_guide/texts/license_registration/index.html#license-type)
- `Docker` (WSL)がインストールされていること
  - [dockerdocs - Install Docker Desktop on Windows](https://docs.docker.com/desktop/setup/install/windows-install/)
    - WSLに `Ubuntu` をインストールすること

      ```sh
      # Powershell 等のターミナルで以下を実行 ※Ubuntuユーザ／パスワード設定をします
      wsl --install -d Ubuntu
      ```

      インストール後はアプリにUbuntuターミナルが追加され、エクスプローラのツリーにLinux > Ubuntuが表示されます。  
      Ubuntu操作はUbuntuターミナルから行います。
      - Ubuntuに `Git` がインストールされていること
        - [git - Install](https://git-scm.com/install/windows)
      - Ubuntuに `Git LFS` がインストールされていること
        - [git-lfs](https://github.com/git-lfs/git-lfs/wiki/Installation)

    - Dockerサポートを有効化すること  
      Docker Desktop UI の settings > Resources > WSL Integration で以下を設定して「Apply & Restart」をクリックします。
      - Enable integration with my default WSL distroにチェックを入れる
      - Ubuntuを有効にする

### Tips

プロキシ環境に構築する場合は、Git、Docker Desktopにプロキシ設定が必要となるケースもあります。  
`git clone` や `docker compose build` 、 `docker compose up` コマンドで失敗する場合はプロキシ設定をご確認ください。

- Git  
  コマンドでプロキシサーバの情報を設定します。  
  設定例
  ```
  git config --global http.proxy http://proxy:port
  git config --global https.proxy http://proxy:port
  ```
- Docker Desktop  
  環境に合わせて以下を適宜設定します。  
  Docker Desktop UI の settings > Resources > Proxies で設定。

## 構成

```
        ┌───────┐
        │ httpd │
        └───────┘
            │
        ┌───────┐                ┌──────────────────┐
        │ resin │                │juggling-build-war│
        └───────┘                └──────────────────┘
        ／   │   ＼   ＼   ＼
┌────────┐ ┌──────┐ ┌─────────┐ ┌───────┐ ┌─────────────────────────┐
│postgres│ │ solr │ │cassandra│ │mailpit│ │accelstudio-testing-agent│
└────────┘ └──────┘ └─────────┘ └───────┘ └─────────────────────────┘
```

- httpd: Web サーバ (Apache HTTPd)
- resin: アプリケーションサーバ (Caucho Resin)
- postgres: データベース
- solr: 検索エンジン
- cassandra: NoSQL データベース
- accelstudio-testing-agent: Accel Studio テスト機能 テスト実行エージェント
- mailpit: メールサーバ (Fake SMTP)
- juggling-build-war: war, 静的ファイルのビルド（ユーザモジュールの追加を含む）

## クローン

下記コマンドを実行することにより、Gitからリポジトリがクローンされます
Ubuntuのターミナルから実行してください。

```sh
# Gitクローン
git clone -b 2026autumn-postgres https://github.com/accelplatform/docker-stacks.git
```

[Git LFS](../README.md#前提条件)をインストールしていない場合、juggling-build-war/overwrite/lib が正しくダウンロードできず、サイズが非常に小さいファイルになることがあります。  
lib配下のファイルサイズが極端に小さい場合は、LFSがインストール、初期化されているかをご確認ください。

## 資材の準備

ライセンスポータルから資材をダウンロードして、以下の通りディレクトリに配置します。  
[intra-mart Accel Platform ライセンスポータル操作ガイド - リソースをダウンロードする](https://document.intra-mart.jp/library/iap/public/im_license_portal/im_license_portal_user_guide/texts/basic_guide/resource/download_resource_file.html)

- resin-pro-4.0.67.tar.gz
- accel_studio_testing_agent-8.0.2.zip
- apache-cassandra-1.1.12-bin.tar.gz
- solr.zip

```

docker-stacks/
├── accelstudio-testing-agent/
│   └── accel_studio_testing_agent-8.0.2.zip
├── resin/
│   └── resin-pro-4.0.67.tar.gz
├── cassandra/
│   └── apache-cassandra-1.1.12-bin.tar.gz
└── solr/
    └── solr.zip
```

### Tips

- プロキシ環境の場合、resin/overwrite/conf ディレクトリの resin.properties もしくは resin.xml にプロキシの設定が必要なケースがあります。  
  外部サービスとの接続に失敗する場合は以下を確認してください。
  - [プロキシ環境下で intra-mart AccelPlatform から外部サイトにアクセスする方法を教えてください。](https://product.intra-mart.support/hc/ja/articles/20083075832473-%E3%83%97%E3%83%AD%E3%82%AD%E3%82%B7%E7%92%B0%E5%A2%83%E4%B8%8B%E3%81%A7-intra-mart-AccelPlatform-%E3%81%8B%E3%82%89%E5%A4%96%E9%83%A8%E3%82%B5%E3%82%A4%E3%83%88%E3%81%AB%E3%82%A2%E3%82%AF%E3%82%BB%E3%82%B9%E3%81%99%E3%82%8B%E6%96%B9%E6%B3%95%E3%82%92%E6%95%99%E3%81%88%E3%81%A6%E3%81%8F%E3%81%A0%E3%81%95%E3%81%84)
- Cassandra、Solrの資材を設置せず[イメージのビルド](#イメージのビルド)を実施するとエラーとなります。環境に含めない場合は、 compose.yaml の `cassandra` `solr` サービス全体と、`resin` - `depends_on` の `cassandra` `solr` をコメントアウトすることで、ビルド、サービス起動から除外できます。

## コンテナのセットアップ

### イメージのビルド

下記コマンドを実行することにより、コンテナイメージの作成が行われます。

```sh
# カレントディレクトリをdocker-stacksにする
cd docker-stacks
# メイン（resin、httpd、postgresql等）イメージのビルド
docker compose build --no-cache
# war作成＋静的ファイル配置イメージのビルド
docker compose build --no-cache juggling-build-war
```

#### war, 静的ファイルのビルド

以下のコマンドにより `data/juggling/project` 配下の構成で war ファイルや静的ファイルをビルドする事ができます。  
`data/juggling/project` には初期状態でプロジェクトが構成されているため、実行すると[初期設定の構成](../README.md#構成とバージョン)で war が作成されます。war は単体テスト環境でビルドされます。

juggling プロジェクトを差し替える場合は[ユーザ作成のJugglingプロジェクトを適用する場合](#ユーザ作成のjugglingプロジェクトを適用する場合)を参照してください。

[Accel Studio テスト機能 テスト実行エージェント](#accel-studio-テスト機能-テスト実行エージェント)を利用しない場合は accel-studio-testing-config.xml で `testing-enabled` を `false` に設定してください。

```sh
# war, 静的ファイルのビルド
docker compose run --rm juggling-build-war
```

ビルドでは `data/juggling/war` 及び `data/juggling/public` を削除して作り直します。  
これらは Resin, Apache HTTPd が直接参照しているため、コンテナが起動済みの場合は `docker compose down` で停止してからビルドし、ビルド後に `docker compose up -d` で起動して下さい。

ビルドが完了すると `data/juggling` ディレクトリ配下に成果物が配置されます。

- `data/juggling/public`
  - 静的ファイルのディレクトリ、実行時にはこのディレクトリが直接 Apache HTTPd から利用されます。
- `data/juggling/repository`
  - Juggling のローカルリポジトリです、このディレクトリを残しておくと次回以降のビルドが高速になります。
- `data/juggling/war`
  - war ファイルのディレクトリ、実行時にはこのディレクトリが直接 Resin から参照されます。
- `data/juggling/imart.war`
  - 生成された war ファイルです、**この Docker stack 実行時には利用されません。**
- `data/juggling/imart.zip`
  - 生成された静的ファイルです、**この Docker stack 実行時には利用されません。**

##### ビルドパラメータ

ビルドの内容は `.env` の以下の環境変数で変更できます。変更後は再ビルド不要で `docker compose run --rm juggling-build-war` に反映されます。

| 環境変数 | 既定値 | 説明 |
| --- | --- | --- |
| `JUGGLING_TEMPLATE` | `resin40` | アプリケーションサーバ (`resin40`=Resin 4.0 / `payara5`=Payara 5 / `weblogic12c`=WebLogic Server 12c / `was80`=WebSphere Application Server 8.0) |
| `JUGGLING_ENV` | `ut` | 環境 (`ut`=単体テスト環境 / `si`=結合テスト環境 / `pt`=統合テスト環境 / `product`=運用環境) |
| `JUGGLING_SAMPLE` | `true` | サンプルを含めるか |
| `JUGGLING_TRIAL` | `false` | ライセンス種別 (`false`=製品版 / `true`=評価版) |
| `JUGGLING_REPOSITORY_BASE` | `http://repository.intra-mart.jp/base` | ベースモジュールのリポジトリ |
| `JUGGLING_REPOSITORY_APP` | `http://repository.intra-mart.jp/app` | アプリケーションモジュールのリポジトリ |

プロジェクトの検証結果が `NG` の場合、ビルドは中断されます。検証結果を承知の上でビルドを続行する場合は `JUGGLING_ALLOW_VALIDATION_NG=true` を指定してください。

##### tips

IM-Juggling を使わずに、jugglingプロジェクトへユーザモジュールを追加することも可能です。  
[ユーザモジュールの追加](#ユーザモジュールの追加)を参照してください。

## 起動

以下のコマンドを実行することにより、メインの各種サービスが起動します。

```sh
# コンテナの起動
docker compose up -d
```

以下のコマンドで起動状態を確認できます。

```bash
# 実行中のコンテナを確認
docker compose ps
```

statusがup状態であればコンテナは起動しています。コンテナは起動していても、サービスの起動に時間がかかるケースがあります。

### tips

[ログ](#ログの確認)でサービスが起動しているかは確認できます。  
また起動時のコマンドから `-d` （デタッチ・モード）オプションを外すと、フォアグラウンド・モードとなりターミナルに直接コンテナが接続された状態で実行され、起動状況が確認できます。起動後でも `d` でデタッチ・モードに移行できます。

### システム管理画面へのログイン

`http://127.0.0.1/imart/system/login` でシステム管理者画面へログインできます。

セットアップを実行してください。
初期状態のプロジェクトで作成した場合、テナントIDは `default` 、Cassandra設定は初期値で設定してください。

#### Tips

テナントセットアップ後はアクティベーションを実行してください。  
[intra-mart Accel Platform ライセンスポータル操作ガイド - 環境を利用するための手続き](https://document.intra-mart.jp/library/iap/public/im_license_portal/im_license_portal_user_guide/texts/basic_guide/environment/procedure.html#environment-procedure)

### テナント画面へのログイン

`http://127.0.0.1/imart/login` でテナント画面へログインできます。

## 停止／再起動

以下のコマンドを実行することにより、メインの各種サービスが停止します。

```sh
# コンテナの停止
docker compose down
```

以下のコマンドは特定のサービスのみを再起動します。

```sh
# Resinの再起動
docker compose restart resin
# Apache HTTPdの再起動
docker compose restart httpd
# Apache Cassandraの再起動
docker compose restart cassandra
# PostgreSQLの再起動
docker compose restart postgresql
# Solrの再起動
docker compose restart solr
```

## ログの確認

`docker compose logs`コマンドにより各サービスのログを確認することが可能です。

```sh
# Resinのログ
docker compose logs -f resin
# Apache HTTPdのログ
docker compose logs -f httpd
# PostgreSQLのログ
docker compose logs -f postgresql
# Apache Cassandraのログ
docker compose logs -f cassandra
# Apache Solrのログ
docker compose logs -f solr
# Accel Studio テスト機能 テスト実行エージェントのログ
docker compose logs -f accelstudio-testing-agent
```

`Ctrl+C` でログから抜けます。

## ユーザ作成のJugglingプロジェクトを適用する場合

### プロジェクトの配置

ユーザが作成したJugglingプロジェクトで環境を作成する場合は、`data/juggling/project` 配下を削除した上で、`project` ディレクトリ配下に juggling プロジェクトのフォルダ、ファイルをコピーします。

```
docker-stacks/
└── data/
    └── juggling/
        └── project/
            ├── juggling.im
            ├── resin-web.xml
            ├── classes/
            ├── conf/
            ├── lib/
            ├── modules/
            └── schema/
```

上記の構成の通り、Juggling プロジェクトの直下に以下のファイルが配置される必要があります。

- juggling.im ファイル
- resin-web.xml ファイル
- conf ディレクトリ
- modules ディレクトリ
- schema ディレクトリ
- classes ディレクトリ (必要に応じて)
- lib ディレクトリ (必要に応じて)

### war作成と再起動

```sh
# war作成＋静的ファイル配置
docker compose run --rm juggling-build-war
# Resinの再起動
docker compose restart resin
# Apache HTTPdの再起動
docker compose restart httpd
```

#### Tips

`docker compose run --rm juggling-build-war` で設定ファイルは以下の設定ファイルへと上書きされます。

- [resin-web.xml](juggling-build-war/overwrite/resin-web.xml)
- [javamail-config.xml](juggling-build-war/overwrite/conf/javamail-config/javamail-config.xml)
- [accel-studio-testing-config.xml](juggling-build-war/overwrite/conf/accel-studio-testing-config.xml)
- [cassandra-config.xml](juggling-build-war/overwrite/conf/cassandra-config.xml)
- [network-agent-config.xml](juggling-build-war/overwrite/conf/network-agent-config.xml)
- [server-context-config.xml](juggling-build-war/overwrite/conf/server-context-config.xml)
- [solr-config.xml](juggling-build-war/overwrite/conf/solr-config.xml)
- [storage-config.xml](juggling-build-war/overwrite/conf/storage-config.xml)

## Accel Studio テスト機能 テスト実行エージェント

Accel Studio テスト機能 テスト実行エージェントはメインイメージに含まれていないため、以下のコマンドでビルドします。

```sh
# テスト実行エージェントイメージのビルド
docker compose build --no-cache accelstudio-testing-agent
```

### 起動

起動前に `.env`ファイルに含まれる`ACCELSTUDIO_TESTING_AGENT_ACCELPLATFORM_ACCESS_TOKEN`環境変数を設定しておく必要があります。  
Accel Platformの管理画面より、[APIキーの払い出し](https://document.intra-mart.jp/library/accel_studio/public/accel_studio_testing_usage_guide/texts/setup/index.html#id7)でAPIキーを発行して設定してください。

```sh
# エージェントの起動
docker compose up -d accelstudio-testing-agent
```

```sh
# エージェントの停止
docker compose down accelstudio-testing-agent
```

#### ベースURL

初期状態の設定のベースURL（ http://127.0.0.1/imart ）を使用しない場合、`.env`ファイルに含まれる`ACCELSTUDIO_TESTING_AGENT_ACCELPLATFORM_BASE_URL`環境変数でベースURLを適切に設定してください。  
ベースURLが不適切な場合、エージェントがテスト対象のURLにアクセスする際に認証に失敗する可能性があります。

#### バージョンによるエラー

Playwrightのブラウザが見つからない、またはバージョン不一致のエラーが出る場合は、`data/accelstudio-testing-agent/logs/accel_studio_testing_agent.log` を確認してください。

本構成はPlaywright本体とMCPが使用するライブラリ・ブラウザをビルド時に準備します。`.env` の `ACCELSTUDIO_TESTING_AGENT_PLAYWRIGHT_VERSION` または `ACCELSTUDIO_TESTING_AGENT_PLAYWRIGHT_MCP_VERSION` を変更した場合、環境変数の変更だけではライブラリとブラウザは更新されません。対応する組合せを確認したうえで、イメージを再ビルドしてコンテナを再作成してください。

```sh
docker compose build --pull accelstudio-testing-agent
docker compose up -d --force-recreate accelstudio-testing-agent
```

## ユーザモジュールの追加

IM-Juggling を使わずに、ユーザモジュール（immファイル）を Juggling プロジェクトへ追加する機能です。  
追加したユーザモジュールを含めて war, 静的ファイルがビルドされます。

`data/juggling/additional-modules`配下に独自に作成されたユーザモジュール（immファイル）を配置して下さい。

```
docker-stacks/
└── data/
    └── juggling/
        └── additional-modules/
            └── <ユーザモジュール>.imm
```

以下のコマンドを実行することにより、配置したユーザモジュールを Juggling プロジェクトへ取り込んだ上で、[war, 静的ファイルのビルド](#war-静的ファイルのビルド)を行います。

```sh
# コンテナの停止
docker compose down
# war, 静的ファイルのビルド
docker compose run --rm juggling-build-war
# コンテナの起動
docker compose up -d
```

ユーザモジュールは以下のように扱われます。

- モジュールIDが Juggling プロジェクトのユーザモジュールと一致する場合は、そのユーザモジュールを差し替えます（バージョンが異なる場合も差し替えます）。
- モジュールIDが一致するユーザモジュールが無い場合は、ユーザモジュールとして追加します。
- モジュールIDが Juggling プロジェクトの構成モジュール（リポジトリから取得するモジュール）と重複する場合はエラーとなります。

### Juggling プロジェクトへの反映について

取り込みは `data/juggling/project` を上書きする形で行われます（immファイルを `data/juggling/project/modules` へコピーし、`juggling.im` を更新します）。  
そのため、IM-Juggling で `data/juggling/project` を開くと、追加したユーザモジュールがユーザモジュールとして表示されます。  
差し替えを行った場合、置き換えられた古いimmファイルは `data/juggling/project/modules` から削除されます。

一度取り込んだ後に `data/juggling/additional-modules` からimmファイルを削除しても、Juggling プロジェクトからは削除されません。  
Juggling プロジェクトから取り除く場合は、IM-Juggling でユーザモジュールを削除して下さい。

取り込み後に検証結果が `NG` となった場合やビルドに失敗した場合は、Juggling プロジェクトを取り込み前の状態へ戻します。  
（差し替えでは古いimmファイルが失われ、juggling.im の履歴にも残らないため、失敗時は元の状態を復元します。）  
復元した場合はその旨がログに出力されます。復元自体に失敗した場合は、取り込み前のプロジェクトが `data/juggling/.project-backup` に残ります。

## 参考

### URL、ポート番号

URL、ポート番号は以下となります。

| ポート番号 | 説明                                                             | URL                                                                                                                                              |
| :--------- | :--------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------- |
| 80         | Web サーバ(Apache HTTPd)で利用しています。                       | http://127.0.0.1/imart/login<br>http://127.0.0.1/imart/system/login                                                                              |
| 8080       | アプリケーションサーバ(Resin)で利用しています。                  | http://127.0.0.1:8080/imart/login<br>base-url を設定している場合は正しく表示されない可能性があります。                                           |
| 9000       | サーバサイドスクリプトのデバッグで利用しています。               | Visual Studio Code の拡張機能（intra-mart e Builder for Accel Platform）にて接続                                                                 |
| 8983       | 検索エンジン(Solr)で利用しています。                             | http://127.0.0.1:8983/solr                                                                                                                       |
| 9160       | NoSQL データベース(Cassandra)で利用しています。                  | Thrift クライアントにて接続                                                                                                                      |
| 5432       | データベース(PostgreSQL)で利用しています。                       | データベースクライアントアプリより接続<br> ホスト: 127.0.0.1<br>ポート: 5432<br>データベース名: iap_db<br>ユーザー名: imart<br>パスワード: imart |
| 8188       | Accel Studio テスト機能 テスト実行エージェントで利用しています。 | http://127.0.0.1:8188                                                                                                                            |
| 8025       | メールサーバ(mailpit)で利用しています。                          | http://127.0.0.1:8025                                                                                                                            |

### メールの確認

`mailpit`コンテナを利用することで、メールの送信内容を確認することができます。
http://127.0.0.1:8025 にアクセスすることで、メールの一覧を確認することができます。

### タイムゾーンの変更

`.env`ファイルに`TZ`環境変数が設定されています、この`TZ`環境変数を変更して下さい。

```text
TZ=Asia/Tokyo
```

### データの永続化

`data`ディレクトリ配下に各サービスのデータが永続化されます。  
その為、コンテナの停止、起動を行った場合においても前回の状態を引き継ぐことができます。

- `data/cassandra`
  - Cassandra のデータ
  - Cassandra のシステムログ
- `data/httpd`
  - Apache HTTPd のアクセスログ
- `data/juggling`
  - Juggling のプロジェクト、成果物
- `data/mailpit`
  - Mailpit のメールデータ
- `data/postgresql`
  - PostgreSQL のデータ
- `data/resin`
  - Resin の各種ログ
  - Accel Platform の各種ログ
  - Accel Platform の**Storage 領域**
- `data/solr`
  - Solr のインデックスデータ
- `data/accelstudio-testing-agent`
  - Accel Studio テスト機能 テスト実行エージェントのログ

#### Tips

テナント環境セットアップ直後の`data`ディレクトリを退避しておくことにより、時間のかかるセットアップを省略することができるようになります。

### データの初期化

データを初期化する場合には、`data`ディレクトリ配下の各サービスのディレクトリを削除することで行うことができます。
必要に応じて、削除前に退避してください。

```sh
# コンテナの停止
docker compose down
# 必要に応じてテスト実行エージェントも停止する
# docker compose down accelstudio-testing-agent
# データの削除（消したい永続化データのディレクトリを指定）　
sudo rm -rf data/cassandra data/httpd data/mailpit data/postgresql data/resin data/solr data/accelstudio-testing-agent
# コンテナの起動
docker compose up -d
```

`data/juggling/project` を削除すると[war, 静的ファイルのビルド](#war-静的ファイルのビルド)ができなくなるため注意してください。

```sh
# プロジェクト以外のjuggling成果物を初期化したい場合
sudo rm -rf data/juggling/public data/juggling/repository data/juggling/war data/juggling/imart.war data/juggling/imart.zip
```

### 部分的に資材を追加する場合

`data/juggling/public` 及び `data/juggling/war` ディレクトリはそれぞれのサービスにマウントされています。  
その為、それぞれのディレクトリに必要となる資材を追加し、コンテナを再起動することで [war, 静的ファイルのビルド](#war-静的ファイルのビルド) せずに変更内容を反映することが可能です。

```sh
# コンテナの再起動
# Resinの再起動
docker compose restart resin
# Apache HTTPdの再起動
docker compose restart httpd
```

## 2026 Autumnでの変更とデータ保存

PostgreSQL 18ではホストの `data/postgresql` をコンテナの `/var/lib/postgresql` にマウントし、実データはその配下の `18/docker` に保存します。PostgreSQL 17以前のデータをこの構成へ直接接続しないでください。既存データの移行は、バックアップと復旧方法を確認した別作業として行ってください。

旧velbenchの個別IMM追加は廃止し、Accel Orbitの標準組み込みを使用します。デバッガも標準組み込みを使用するため、旧IMMを `additional-modules` などへ追加する必要はありません。標準デバッガの版番号は8.0.4です。

SolrはAutumn向けに提供された `solr.zip` を使用します。同じ9.6.0-1の版表示でも、旧資材には追加のベクトル次元とインデックス付きメタデータ用のスキーマ定義がありません。既存環境の資材をそのまま流用せず、Autumn向け資材を配置してイメージを再ビルドしてください。

Resin・Solr・CassandraのJavaは11系、テストエージェントは17系を維持しています。JDBCはPostgreSQL 42.7.13を使用します。テストエージェントはビルド時にPlaywrightとMCPのライブラリ・ブラウザを準備し、起動時にその `node_modules` を使用します。`.env` のPlaywrightとMCPの版を変更した場合は、エージェントイメージを再ビルドしてください。

本構成は開発用の新規環境向けです。実測した動作条件と未確認事項は検証記録に従ってください。

### 検証範囲と公開版での再確認

2026-09-27にmacOS 27.0（Apple Silicon arm64）、Docker Desktop 4.92.0 / Engine 29.8.0 / Compose 5.5.1で、新規環境のビルド・WAR生成・起動とテナントセットアップ全2852件の成功（エラー0件）を確認しました。DB実測版はPostgreSQL 18.6です。Docker VMは8 CPU・11.67GiB、検証時のみCassandraのヒープを512MiB（new世代128MiB）に制限しています。このヒープ上書きは配布設定には含めていません。

2026 Autumnの検証合格基準は、新規環境でのイメージビルド、WAR生成、サービス起動、テナントセットアップの完了です。セットアップ後の機能別動作、テストエージェントの認証付き実行、障害時の切替は、この検証の対象に含みません。

提供されたAutumn雛形と先行資材を基準にしています。公開配布経路からのAutumn資材取得・再検証、およびAutumnの公式動作要件への適合確認は未完了です。配布設定の取得先は公開URLを使用しています。公開後に資材を再取得し、同じ手順でセットアップを確認してください。今回の検証ではライセンスの追加準備は不要でした。
