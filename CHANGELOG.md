## [1.7.0](https://github.com/avi892nash/ICE/compare/v1.6.0...v1.7.0) (2026-05-24)

### Features

* **seo:** treat site as educational resource and fix canonical URL ([#27](https://github.com/avi892nash/ICE/issues/27)) ([97a9cdc](https://github.com/avi892nash/ICE/commit/97a9cdc6be97b486d4753b2317973ac8e792be7b))

## [1.6.0](https://github.com/avi892nash/ICE/compare/v1.5.2...v1.6.0) (2026-05-24)

### Features

* **ui:** show package version in footer ([#28](https://github.com/avi892nash/ICE/issues/28)) ([2042da3](https://github.com/avi892nash/ICE/commit/2042da3b5d8da1681cf0a53b0882cb0fa2658a50))

## [1.5.2](https://github.com/avi892nash/ICE/compare/v1.5.1...v1.5.2) (2026-05-24)

### Bug Fixes

* **packaging:** remove MemoryDenyWriteExecute, incompatible with V8 JIT ([#25](https://github.com/avi892nash/ICE/issues/25)) ([264ca21](https://github.com/avi892nash/ICE/commit/264ca21e21c6c544baa960e51b1037e675ac29fa))

## [1.5.1](https://github.com/avi892nash/ICE/compare/v1.5.0...v1.5.1) (2026-05-24)

### Refactor

* **packaging:** rename PORT to ICE_DEMO_PORT, drop UNIQUE_PORT ([#24](https://github.com/avi892nash/ICE/issues/24)) ([827f825](https://github.com/avi892nash/ICE/commit/827f8259c0920398d3695a1f610e02d93912142e))

## [1.5.0](https://github.com/avi892nash/ICE/compare/v1.4.2...v1.5.0) (2026-05-24)

### Features

* **packaging:** change default PORT to 4123, add UNIQUE_PORT ([#23](https://github.com/avi892nash/ICE/issues/23)) ([9afc16e](https://github.com/avi892nash/ICE/commit/9afc16e2a9f097db13593f78bdb53db3891b0c33))

## [1.4.2](https://github.com/avi892nash/ICE/compare/v1.4.1...v1.4.2) (2026-05-18)

### Refactor

* **release:** bump package.json + slim Depends to match Thor ([#22](https://github.com/avi892nash/ICE/issues/22)) ([0f0cb6e](https://github.com/avi892nash/ICE/commit/0f0cb6ee907d92c0b7a9aa979ab450a619f4687a))

### Documentation

* collapse install snippet to a single line with && ([#21](https://github.com/avi892nash/ICE/issues/21)) ([cc64491](https://github.com/avi892nash/ICE/commit/cc64491d41a90259075d134ffb2e1023e03e50e9))

## [1.4.1](https://github.com/avi892nash/ICE/compare/v1.4.0...v1.4.1) (2026-05-18)

### Refactor

* **release:** final Thor alignment — arch all, ice-demo.deb, no install.sh ([#20](https://github.com/avi892nash/ICE/issues/20)) ([a2bc357](https://github.com/avi892nash/ICE/commit/a2bc35766c7f3a7e97c5ce0a1ee25e93e5d8fbfe))

## [1.4.0](https://github.com/avi892nash/ICE/compare/v1.3.1...v1.4.0) (2026-05-18)

### Features

* **install:** one-line installer script ([#19](https://github.com/avi892nash/ICE/issues/19)) ([432d7fb](https://github.com/avi892nash/ICE/commit/432d7fb006d354bf1b64847b4350642cc0feafb2))

## [1.3.1](https://github.com/avi892nash/ICE/compare/v1.3.0...v1.3.1) (2026-05-18)

### Refactor

* **ci:** align pipeline with Thor — single build, npx semantic-release ([#18](https://github.com/avi892nash/ICE/issues/18)) ([696f662](https://github.com/avi892nash/ICE/commit/696f66262adcd184cbae31ffcd06c4eb23ea56bd))

## [1.3.0](https://github.com/avi892nash/ICE/compare/v1.2.0...v1.3.0) (2026-05-18)

### Features

* **release:** stable asset name 'ice-demo_amd64.deb' for one-line curl install ([#17](https://github.com/avi892nash/ICE/issues/17)) ([7a37b71](https://github.com/avi892nash/ICE/commit/7a37b71c8a2eb8f9bcab5cb8008fae6e27c5cc44))

## [1.2.0](https://github.com/avi892nash/ICE/compare/v1.1.2...v1.2.0) (2026-05-18)

### Features

* **release:** adopt Thor-style multi-job pipeline + GH-Releases-based auto-upgrade ([#14](https://github.com/avi892nash/ICE/issues/14)) ([9897ce3](https://github.com/avi892nash/ICE/commit/9897ce353b5230f7a44dbe46a7aaa413ba187fa4))

### Bug Fixes

* **ci:** build Next.js in the release job ([#15](https://github.com/avi892nash/ICE/issues/15)) ([2954f62](https://github.com/avi892nash/ICE/commit/2954f6265b3b0c0cfc2214833f49d4b7d10d9b61)), closes [#14](https://github.com/avi892nash/ICE/issues/14)

### Documentation

* add Debian/Ubuntu install instructions to README ([#2](https://github.com/avi892nash/ICE/issues/2)) ([d7384e9](https://github.com/avi892nash/ICE/commit/d7384e96a28c2fe777d6b53a7603bf663d512316))

## [1.1.2](https://github.com/avi892nash/ICE/compare/v1.1.1...v1.1.2) (2026-05-18)

### Bug Fixes

* **a11y:** label external GitHub link for screen readers ([#10](https://github.com/avi892nash/ICE/issues/10)) ([5ec4cb6](https://github.com/avi892nash/ICE/commit/5ec4cb6b999881f0344ecde9184190ab83dbb1a7))

## [1.1.1](https://github.com/avi892nash/ICE/compare/v1.1.0...v1.1.1) (2026-05-18)

### Bug Fixes

* **ci:** enable Pages bootstrap in publish-apt job ([#9](https://github.com/avi892nash/ICE/issues/9)) ([a5847f5](https://github.com/avi892nash/ICE/commit/a5847f5eeb70ef92999974039aa4cf03681ab520)), closes [#7](https://github.com/avi892nash/ICE/issues/7)

## [1.1.0](https://github.com/avi892nash/ICE/compare/v1.0.0...v1.1.0) (2026-05-18)

### Features

* **footer:** add View on GitHub link ([#7](https://github.com/avi892nash/ICE/issues/7)) ([6d972c8](https://github.com/avi892nash/ICE/commit/6d972c8695e91c9b883cb9c2655cb74ab060d7f0))

## 1.0.0 (2026-05-18)

### Features

* **branding:** add og-image, favicons, and PWA app icons ([6074bbb](https://github.com/avi892nash/ICE/commit/6074bbba4928da54bdf4612f30bdf25bcac4f547))
* **seo:** comprehensive metadata, OpenGraph, Twitter cards, JSON-LD ([4042076](https://github.com/avi892nash/ICE/commit/40420766dec8e476b0d09e2f740bd8e16f39a10a)), closes [#0284c7](https://github.com/avi892nash/ICE/issues/0284c7)
* **seo:** generate robots.txt, sitemap.xml, and PWA manifest ([e1ae00a](https://github.com/avi892nash/ICE/commit/e1ae00a03c84fcd8a491fffbdcdb49c72fa0f2f6))

### Bug Fixes

* **ci:** move deb.fields to top level of nfpm.yaml ([#4](https://github.com/avi892nash/ICE/issues/4)) ([bc7c66f](https://github.com/avi892nash/ICE/commit/bc7c66f7b50d69960a6523866a3466193048addd)), closes [#3](https://github.com/avi892nash/ICE/issues/3)
* **ci:** nfpm content collisions — use type: tree for directories ([#5](https://github.com/avi892nash/ICE/issues/5)) ([47b87a1](https://github.com/avi892nash/ICE/commit/47b87a1f980a5277911e7cb0c5eb5eaf37c356a0)), closes [#4](https://github.com/avi892nash/ICE/issues/4)
* **ci:** pin nfpm version and use cycjimmy/semantic-release-action ([5224cfa](https://github.com/avi892nash/ICE/commit/5224cfa17e9158d1e4638bd425f8f7766a684d0a)), closes [#1](https://github.com/avi892nash/ICE/issues/1)
* **ci:** skip husky commit-msg hook in CI ([#6](https://github.com/avi892nash/ICE/issues/6)) ([9f32a7f](https://github.com/avi892nash/ICE/commit/9f32a7f017487c84be45ecf19d9211559a9f14a5))

### Documentation

* add INSTALL.md and PUBLISHING.md, link from README ([d976603](https://github.com/avi892nash/ICE/commit/d976603687207f81a89d3e8d70ab85a12a2b6ef1))
