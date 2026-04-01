export const dateTime = (date: Date | string): string => {
    const d = typeof date === ***REMOVED***string***REMOVED*** ? new Date(date) : date;
    return d.toLocaleString();
}

export const date = (date: Date | string): string => {
    const d = typeof date === ***REMOVED***string***REMOVED*** ? new Date(date) : date;
    return d.toLocaleDateString();
}