import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

/**
 * This file is web-only and used to configure the root HTML for every web page during static rendering.
 * The contents of this function only run in Node.js environments and do not have access to the DOM or browser APIs.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/*
          Disable body scrolling on web. This makes ScrollView components work closer to how they do on native.
          However, body scrolling is often nice to have for mobile web. If you want to enable it, remove this line.
        */}
        <ScrollViewStyleReset />

        {/* Using raw CSS styles as an escape-hatch to ensure the background color never flickers in dark-mode. */}
        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
        {/* Icon fonts — chargés via CSS pour garantir la dispo en prod */}
        <style dangerouslySetInnerHTML={{ __html: iconFontFaces }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const responsiveBackground = `
body {
  background-color: #fff;
}
@media (prefers-color-scheme: dark) {
  body {
    background-color: #000;
  }
}`;

const iconFontFaces = `
@font-face {
  font-family: 'Ionicons';
  src: url('/fonts/Ionicons.ttf') format('truetype');
  font-display: block;
}
@font-face {
  font-family: 'MaterialIcons';
  src: url('/fonts/MaterialIcons.ttf') format('truetype');
  font-display: block;
}
@font-face {
  font-family: 'MaterialCommunityIcons';
  src: url('/fonts/MaterialCommunityIcons.ttf') format('truetype');
  font-display: block;
}
@font-face {
  font-family: 'FontAwesome';
  src: url('/fonts/FontAwesome.ttf') format('truetype');
  font-display: block;
}
`;
