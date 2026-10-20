/** 分层硬约束：core 不依赖外层，ports 纯接口，引擎不依赖应用。 */
module.exports = {
  forbidden: [
    {
      name: 'core-no-outward',
      severity: 'error',
      comment: 'core 是内核：不得依赖 ports / impl / data / apps',
      from: { path: '^packages/engine/src/core' },
      to: { path: '^(packages/engine/src/(ports|impl|data|demo)|apps)' },
    },
    {
      name: 'ports-pure',
      severity: 'error',
      comment: 'ports 只允许纯类型，不得依赖任何实现或第三方库',
      from: { path: '^packages/engine/src/ports' },
      to: { pathNot: '^packages/engine/src/ports' },
    },
    {
      name: 'engine-not-into-app',
      severity: 'error',
      comment: '引擎不得依赖应用层',
      from: { path: '^packages/engine' },
      to: { path: '^apps' },
    },
    {
      name: 'ui-no-engine-internals',
      severity: 'error',
      comment: 'UI 层只允许快照类型与 React，不得依赖引擎内核/实现/应用控制器',
      from: { path: '^apps/game/src/ui' },
      to: { path: '^(packages/|apps/game/src/(?!ui))' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.base.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
      extensions: ['.ts', '.js'],
    },
    reporterOptions: { dot: { collapsePattern: 'node_modules/[^/]+' } },
  },
};
