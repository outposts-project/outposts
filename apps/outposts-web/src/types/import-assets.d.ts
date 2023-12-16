declare module "*?asset-source" {
  const source: string;
  export default source;
}

declare module '*?asset-resource' {
  const fileURI: string;
  export default fileURI;
}

declare module '*?asset-inline' {
  const dataURI: string;
  export default dataURI;
}



