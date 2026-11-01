document.addEventListener('submit', (event) => {
  const message = event.target instanceof HTMLFormElement ? event.target.dataset.confirm : undefined;
  if (message && !window.confirm(message)) {
    event.preventDefault();
  }
});
