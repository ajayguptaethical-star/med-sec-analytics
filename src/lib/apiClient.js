export const safeFetchJson = async (url, options = {}) => {
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const data = await res.json();
      return { ok: res.ok, status: res.status, data };
    }

    const text = await res.text();
    const cleanText = text.replace(/<[^>]*>/g, '').trim().substring(0, 150);
    return {
      ok: false,
      status: res.status,
      data: { 
        error: cleanText || `Server returned response status ${res.status}`,
        isHtml: true
      }
    };
  } catch (err) {
    return {
      ok: false,
      status: 500,
      data: { error: err.message || 'Network request failed' }
    };
  }
};
