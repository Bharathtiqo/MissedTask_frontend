const test = async () => {
  const fetch = global.fetch;
  const url = 'https://example.com';
  try {
    const res = await fetch(url);
    console.log('status', res.status);
  } catch (err) {
    console.log('error', err);
  }
};

test();
