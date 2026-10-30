import { build } from "esbuild";
import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const classicRoot = dirname(require.resolve("classic-level/package.json"));
const output = join(root, "assets", "native-level");
await mkdir(output, { recursive: true });

// Raycast bundles JS but does not relocate node-gyp-build's native lookup directory.
// Bundle the JS beside the universal macOS N-API binary and load that asset explicitly.
const result = await build({
  absWorkingDir: root,
  entryPoints: [join(classicRoot, "index.js")],
  outfile: join(output, "index.cjs"),
  platform: "node",
  format: "cjs",
  target: "node18",
  bundle: true,
  metafile: true,
  plugins: [
    {
      name: "native-level-asset",
      setup(build) {
        build.onResolve({ filter: /^node-gyp-build$/ }, () => ({
          path: "binding",
          namespace: "native-level",
        }));
        build.onLoad({ filter: /.*/, namespace: "native-level" }, () => ({
          contents:
            'module.exports = () => require(require("node:path").join(__dirname, "classic-level.node"));',
          loader: "js",
        }));
      },
    },
  ],
});
await copyFile(
  join(classicRoot, "prebuilds", "darwin-x64+arm64", "classic-level.node"),
  join(output, "classic-level.node"),
);

// Preserve licenses for the bundled JS and native LevelDB/Snappy implementation.
const packageRoots = new Set([classicRoot]);
for (const input of Object.keys(result.metafile.inputs)) {
  if (input.startsWith("native-level:")) continue;
  let directory = dirname(resolve(root, input));
  while (directory !== dirname(directory)) {
    try {
      await readFile(join(directory, "package.json"));
      packageRoots.add(directory);
      break;
    } catch {
      directory = dirname(directory);
    }
  }
}
const licenses = [];
for (const directory of [...packageRoots].sort()) {
  const pkg = JSON.parse(await readFile(join(directory, "package.json"), "utf8"));
  const files = (await readdir(directory)).filter((name) => /^(license|copying)(\..*)?$/i.test(name));
  if (!files.length) throw new Error(`Missing license for ${pkg.name}`);
  for (const file of files)
    licenses.push(`${pkg.name}@${pkg.version}\n\n${await readFile(join(directory, file), "utf8")}`);
}
for (const file of ["deps/leveldb/leveldb-1.20/LICENSE", "deps/snappy/snappy/COPYING"]) {
  licenses.push(`${file}\n\n${await readFile(join(classicRoot, file), "utf8")}`);
}
await writeFile(join(output, "LICENSES.txt"), licenses.join("\n\n---\n\n"));
console.log("已准备 macOS arm64/x64 LevelDB 运行资源。");
