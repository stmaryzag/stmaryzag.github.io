const res = new Response("<html>", { headers: { "content-type": "text/html" } });
console.log(res.headers.get("content-type"));
