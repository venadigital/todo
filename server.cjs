(async () => {
  try {
    await import('./server/index.js');
  } catch (error) {
    console.error('failed to boot server:', error);
    process.exit(1);
  }
})();
