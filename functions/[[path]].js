function rewriteRequest(request, pathname) {
  const url = new URL(request.url);
  url.pathname = pathname;

  return new Request(url.toString(), request);
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const pathname = url.pathname;

  const isStaticFile = /\.[a-z0-9]+$/i.test(pathname);

if (isStaticFile) {
  return env.ASSETS.fetch(request);
}

  const routes = [
  {
    matches: /^\/account\/pinboard\/?$/,
    file: '/account/pinboard/'
  },
  {
    matches: /^\/story\/[^/]+\/chapter\/[^/]+\/?$/,
    file: '/story/chapter/'
  },
  {
    matches: /^\/story\/[^/]+\/?$/,
    file: '/story/'
  },
  {
    matches: /^\/writer\/[^/]+\/?$/,
    file: '/writer/'
  },
  {
    matches: /^\/my\/stories\/[^/]+\/chapters\/new\/?$/,
    file: '/my/stories/chapters/new/'
  },
  {
    matches: /^\/my\/stories\/[^/]+\/chapters\/[^/]+\/edit\/?$/,
    file: '/my/stories/chapters/edit/'
  },
  {
    matches: /^\/my\/stories\/[^/]+\/edit\/?$/,
    file: '/my/stories/edit/'
  },
  {
    matches: /^\/my\/stories\/[^/]+\/?$/,
    file: '/my/stories/show/'
  }
];

  const matchedRoute = routes.find((route) => route.matches.test(pathname));

  if (matchedRoute) {
    return env.ASSETS.fetch(
      rewriteRequest(request, matchedRoute.file)
    );
  }

  return context.next();
}