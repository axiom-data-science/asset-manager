export function twconfig(
    envsubbed_value: string,
    env_var_name: string,
    unknown: string
): string {

    const env_var_val_or_null: string | null = (
        env_var_name in import.meta.env
            ? import.meta.env[env_var_name]
            : null
    );

    if (!envsubbed_value) {
        if (import.meta.env.PROD) {
            console.warn(
                `envsub***REMOVED***d value empty, falling back to env var`
            )
        }

        if (env_var_val_or_null === null) {
            return unknown;
        }

        return env_var_val_or_null;
    }

    if (
        envsubbed_value.startsWith("$") ||
        envsubbed_value.startsWith("${")
    ) {
        if (import.meta.env.PROD) {
            console.warn(
                `envsub***REMOVED***d value not replaced (***REMOVED***${envsubbed_value}***REMOVED***), falling back to env var ***REMOVED***${env_var_name}***REMOVED***`
            )
        }

        if (env_var_val_or_null === null) {
            return unknown;
        }

        return env_var_val_or_null;
    }

    return envsubbed_value;
}
