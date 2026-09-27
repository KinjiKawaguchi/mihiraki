/** Vite returns the processed stylesheet as a string for `?inline` imports. */
declare module "*.css?inline" {
  const css: string;
  export default css;
}
