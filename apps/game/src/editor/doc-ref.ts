import type { MutableRefObject } from 'react';
import type { Scene } from '@itb/engine/scene';

/** 编辑器当前文档/选中的同步引用：同一事件循环内连续操作也读最新值。 */
export type SceneDocRef = MutableRefObject<Scene | null>;
export type SelectionRef = MutableRefObject<string | null>;
