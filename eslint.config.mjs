import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Deprecated proof-of-participation surfaces kept temporarily for migration safety.
    "src/app/proofs/**",
    "src/app/0g-proof/**",
    "src/components/AuthenticatedImage.tsx",
    "src/components/CheckInModal.tsx",
    "src/components/EnterEventDialog.tsx",
    "src/components/EventEntriesDialog.tsx",
    "src/components/MissionQRCodePanel.tsx",
    "src/components/MissionVerifyAction.tsx",
    "src/hooks/useMissionVerification.ts",
  ]),
]);

export default eslintConfig;
