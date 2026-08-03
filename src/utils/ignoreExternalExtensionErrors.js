const METAMASK_EXTENSION_ID = "nkbihfbeogaeaoehlefnkodbefgpgknn";

const errorText = (event) => {
  const reason = event?.reason;
  const error = event?.error;
  return [
    event?.message,
    event?.filename,
    reason?.message,
    reason?.stack,
    error?.message,
    error?.stack,
  ]
    .filter(Boolean)
    .join("\n");
};

const isMetaMaskExtensionError = (event) => {
  const value = errorText(event);
  if (value.includes(`chrome-extension://${METAMASK_EXTENSION_ID}`)) return true;
  return /Failed to connect to MetaMask/i.test(value) && /chrome-extension:\/\//i.test(value);
};

const ignoreMetaMaskError = (event) => {
  if (!isMetaMaskExtensionError(event)) return;
  event.preventDefault?.();
  event.stopImmediatePropagation?.();
};

// MetaMask injects its inpage script into every tab. A rejected connection from
// that extension is outside this application but CRA's development overlay can
// still treat it as an application crash. Only suppress the known extension
// origin; all errors raised by Phúc Long remain visible.
window.addEventListener("error", ignoreMetaMaskError, true);
window.addEventListener("unhandledrejection", ignoreMetaMaskError, true);

