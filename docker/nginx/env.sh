#!/bin/sh

echo "Injecting runtime environment variables into *.template files..."

VARS_TO_REPLACE="$(printf ***REMOVED***${%s} ***REMOVED*** $(env | grep -ie "^TWOWOLVES_" | cut -d***REMOVED***=***REMOVED*** -f1))"

echo "Env vars to replace: $VARS_TO_REPLACE"

DIR_TO_REPLACE="/usr/share/nginx/html";

if [ ! -d "$DIR_TO_REPLACE" ]; then
    echo "Invalid directory $DIR_TO_REPLACE" 1>&2;
    exit 2;
fi


find "$DIR_TO_REPLACE" \
    -type f -iname ***REMOVED****.js***REMOVED*** \
    | while read -r line; do \
        envsubst "$VARS_TO_REPLACE" < "$line" > "$line.replaced";

        dn="$( dirname "$line.replaced" )";
        bn="$( basename "$line.replaced" ".replaced" )";

        if cmp -s "$line" "$line.replaced"; then
            # No changes.
            continue
        else
            echo "replacing $line with $dn/$bn"
            # cat "$line.replaced";

            # rename to the not-templated name
            #   initdb.sh.template.replaced -> initdb.sh)
            mv -v "$line.replaced" "$dn/$bn"
        fi
    done