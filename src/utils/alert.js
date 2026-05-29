export const appAlert = (message, type = 'info') => {
    return new Promise(resolve => {
        window.dispatchEvent(new CustomEvent('global-dialog', {
            detail: { type: 'alert', message, alertType: type, resolve }
        }));
    });
};

export const appConfirm = (message) => {
    return new Promise(resolve => {
        window.dispatchEvent(new CustomEvent('global-dialog', {
            detail: { type: 'confirm', message, resolve }
        }));
    });
};

export const appPrompt = (message) => {
    return new Promise(resolve => {
        window.dispatchEvent(new CustomEvent('global-dialog', {
            detail: { type: 'prompt', message, resolve }
        }));
    });
};
