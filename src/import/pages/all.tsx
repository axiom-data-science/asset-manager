import type { ReactElement } from ***REMOVED***react***REMOVED***
import importConfigs from ***REMOVED***../config***REMOVED***
import { Button, Checkbox, Input } from ***REMOVED***@axdspub/axiom-ui-utilities***REMOVED***
import { useState } from ***REMOVED***react***REMOVED***
import { Check } from ***REMOVED***lucide-react***REMOVED***

const ImportAllPage = (): ReactElement => {
  const configs = { ...importConfigs }
  const [settings, setSettings] = useState<
    Record<
      string,
      {
        selected: boolean
        include_enums: boolean
        override_import?: string
        override_root?: string
      }
    >
  >(
    Object.fromEntries(
      Object.keys(configs).map((k) => {
        return [
          k,
          {
            selected: true,
            include_enums: false,
          },
        ]
      })
    )
  )

  return (
    <>
      <div className="flex flex-row gap-4 items-center p-4 bg-white sticky top-0 border-b z-10">
        <span className="text-lg font-semibold">Import All</span>
        <Button
          onClick={() => {
            console.log(***REMOVED***Import settings:***REMOVED***, settings)
          }}
          variant="primary"
        >
          Start Import
        </Button>
      </div>
      <div className="flex flex-col gap-4">
        {Object.entries(configs).map(([key, config]) => (
          <div key={key} className="flex flex-col gap-2 p-4 even:bg-gray-100">
            <span>
              <Checkbox
                id={`import-${key}`}
                size="xl"
                testId={`import-${key}`}
                label={config.label}
                value={settings[key]?.selected ?? false}
                onChange={(e) => {
                  setSettings({
                    ...settings,
                    [key]: {
                      ...settings[key],
                      selected: e,
                    },
                  })
                }}
              />
            </span>
            {settings[key]?.selected && (
              <>
                <span>
                  <Checkbox
                    id={`import-${key}-enums`}
                    testId={`import-${key}-enums`}
                    label="Include Enums"
                    value={settings[key]?.include_enums ?? false}
                    onChange={(e) => {
                      setSettings({
                        ...settings,
                        [key]: {
                          ...settings[key],
                          include_enums: e,
                        },
                      })
                    }}
                  />
                </span>
                <span>
                  <Input
                    id={`import-${key}-override-endpoint`}
                    testId={`import-${key}-override-endpoint`}
                    label="Override Endpoint"
                    placeholder={config.defaultImportUrl}
                    value={settings[key]?.override_import ?? config.defaultImportUrl}
                    size="xs"
                    onChange={(e) => {
                      if (e !== undefined && e.trim() !== ***REMOVED******REMOVED***) {
                        setSettings({
                          ...settings,
                          [key]: {
                            ...settings[key],
                            override_import: e,
                          },
                        })
                      }
                    }}
                  />
                  <span className="text-xs text-gray-500">
                    Override the default endpoint for this import. If left blank, the default
                    endpoint will be used.
                  </span>
                </span>
                <span>
                  <Input
                    id={`import-${key}-override-root`}
                    testId={`import-${key}-override-root`}
                    label="Override Root"
                    placeholder={config.defaultDetailRoot}
                    value={settings[key]?.override_root ?? config.defaultDetailRoot}
                    size="xs"
                    onChange={(e) => {
                      if (e !== undefined && e.trim() !== ***REMOVED******REMOVED***) {
                        setSettings({
                          ...settings,
                          [key]: {
                            ...settings[key],
                            override_root: e,
                          },
                        })
                      }
                    }}
                  />
                  <span className="text-xs text-gray-500">
                    Override the default root for this import. If left blank, the default root will
                    be used.
                  </span>
                </span>
              </>
            )}
          </div>
        ))}
      </div>
    </>
  )
}

export default ImportAllPage
