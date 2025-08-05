export function makeBanner(): string {
  // eslint-disable-next-line prettier/prettier
  const bannerLines = ['┬  ┬┌┐ ┬  ┌─┐┌┐   ┌─┐┬', '│  │├┴┐│  ├─┤├┴┐  ├─┤│', '┴─┘┴└─┘┴─┘┴ ┴└─┘  ┴ ┴┴'];
  return bannerLines.join('\n');
}
