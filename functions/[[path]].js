function rewriteRequest(request, pathname) {
  const url = new URL(request.url);
  url.pathname = pathname;

  return new Request(url.toString(), request);
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const pathname = url.pathname;

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

  const matchedRoute = routes.find((route) => route.matches.test(pathname));

  if (matchedRoute) {
    return env.ASSETS.fetch(
      rewriteRequest(request, matchedRoute.file)
    );
  }

  return env.ASSETS.fetch(request);
}