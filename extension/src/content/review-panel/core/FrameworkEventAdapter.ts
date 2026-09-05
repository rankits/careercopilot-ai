export class FrameworkEventAdapter {
  static setValue(el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, value: string) {
    if (el instanceof HTMLInputElement && el.type === 'file') {
      // file inputs handled separately
      return;
    }

    // Call native setter to bypass React/Vue interception
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value',
    )?.set;

    const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      'value',
    )?.set;

    const nativeSelectValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLSelectElement.prototype,
      'value',
    )?.set;

    if (el instanceof HTMLInputElement && nativeInputValueSetter) {
      nativeInputValueSetter.call(el, value);
    } else if (el instanceof HTMLTextAreaElement && nativeTextAreaValueSetter) {
      nativeTextAreaValueSetter.call(el, value);
    } else if (el instanceof HTMLSelectElement && nativeSelectValueSetter) {
      nativeSelectValueSetter.call(el, value);
    } else {
      el.value = value;
    }

    // Dispatch events so React/Angular/Vue picks up the change
    el.dispatchEvent(
      new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value }),
    );
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }
}
