import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  appName: "keytrip",
  brand: {
    primaryColor: "#FF1FAF",
  },
  navigationBar: {
    withBackButton: true,
    withHomeButton: true,
    withTitle: true,
    theme: "dark",
  },
  webView: {
    bounces: false,
    pullToRefreshEnabled: false,
    overScrollMode: "never",
    allowsBackForwardNavigationGestures: true,
  },
  permissions: [],
  webBundleDir: "dist",
});
