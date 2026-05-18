#!/bin/sh

# /data/additional-modules/ ディレクトリ内のすべてのファイルを処理
for file in /data/additional-modules/*
do
    if [ -f "$file" ]; then
        # ファイルの拡張子を取得
        extension="${file##*.}"

        # .zip または .imm ファイルのみを処理
        if [ "$extension" = "zip" ] || [ "$extension" = "imm" ]; then
            filename=$(basename "$file")
            echo "Processing $filename..."

            # warファイルの抽出
            echo "Extract imm (war)"
            java -jar lib/extract-imm.jar -t war -s "$file" /data/war

            # staticファイルの抽出
            echo "Extract imm (static)"
            java -jar lib/extract-imm.jar -t static -s "$file" /data/public

            echo "Finished processing $filename"
        fi
    fi
done

echo "All files processed."