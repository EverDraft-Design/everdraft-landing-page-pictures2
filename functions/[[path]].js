function makeAssetRequest(request, pathname) {
  const url = new URL(request.url);
  url.pathname = pathname;

  return new Request(url.toString(), {
    method: 'GET',
    headers: request.headers,
    redirect: 'manual'
  });
}

async function fetchTemplate(env, request, pathname) {
  let response = await env.ASSETS.fetch(
    makeAssetRequest(request, pathname)
  );

  // Cloudflare may redirect /folder/index.html to /folder/.
  // Follow that redirect internally so the browser keeps the original
  // dynamic URL, including the story slug.
  for (let attempt = 0; attempt < 3 && response.status >= 300 && response.status < 400; attempt += 1) {
    const location = response.headers.get('Location');

    if (!location) break;

    const redirectUrl = new URL(location, request.url);

    response = await env.ASSETS.fetch(
      makeAssetRequest(request, redirectUrl.pathname)
    );
  }

  return response;
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Real files such as .js, .css, .png and .html must be served directly.
  if (/\.[a-z0-9]+$/i.test(pathname)) {
    return env.ASSETS.fetch(request);
  }

  const routes = [
    {
      matches: /^\/account\/pinboard\/?$/,
      file: '/account/pinboard/index.html'
    },
    {
      matches: /^\/story\/[^/]+\/chapter\/[^/]+\/?$/,
      file: '/story/chapter/index.html'
    },
    {
      matches: /^\/story\/[^/]+\/?$/,
      file: '/story/index.html'
    },
    {
      matches: /^\/writer\/[^/]+\/?$/,
      file: '/writer/index.html'
    },
    {
      matches: /^\/my\/stories\/[^/]+\/chapters\/new\/?$/,
      file: '/my/stories/chapters/new/index.html'
    },
    {
      matches: /^\/my\/stories\/[^/]+\/chapters\/[^/]+\/edit\/?$/,
      file: '/my/stories/chapters/edit/index.html'
    },
    {
      matches: /^\/my\/stories\/[^/]+\/edit\/?$/,
      file: '/my/stories/edit/index.html'
    },
    {
      matches: /^\/my\/stories\/[^/]+\/?$/,
      file: '/my/stories/show/index.html'
    }
  ];

  const matchedRoute = routes.find((route) =>
    route.matches.test(pathname)
  );

  if (matchedRoute) {
    return fetchTemplate(env, request, matchedRoute.file);
  }

  return context.next();
}