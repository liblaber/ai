/**
 * Extracts form data from all form elements within a container element.
 *
 * Searches for all input, select, and textarea elements within the provided container
 * and creates a FormData object containing their name-value pairs. Only elements with
 * a 'name' attribute will be included in the resulting FormData.
 *
 * @param {HTMLElement} container - The container element to search for form elements within
 * @returns {FormData} A FormData object containing all named form elements and their values
 *
 */
export const getFormData = (container: HTMLElement): FormData => {
  const formData = new FormData();
  const elements = container.querySelectorAll('input, select, textarea');

  elements.forEach((element) => {
    if (
      element instanceof HTMLInputElement ||
      element instanceof HTMLSelectElement ||
      element instanceof HTMLTextAreaElement
    ) {
      if (element.name) {
        formData.append(element.name, element.value);
      }
    }
  });

  return formData;
};
