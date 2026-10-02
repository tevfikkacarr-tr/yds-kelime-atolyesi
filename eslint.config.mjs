import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const config = [
  // Motor parçaları birleştirilerek tek modül olur; tek başına lint edilmez. Üretilen dosyalar da hariç.
  { ignores: ["node_modules/**", ".next/**", "out/**", "public/sw.js", "src/engine/**", "tests/fixtures/**", "tools/**", "next-env.d.ts"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  { files: ["**/*.cjs"], rules: { "@typescript-eslint/no-require-imports": "off" } },
];

export default config;
