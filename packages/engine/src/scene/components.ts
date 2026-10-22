import { defineComponent } from '../core/types.js';

/** 场景父子关系组件：`parent` 存父实体的 EntityId，变换合成由场景层负责。 */
export const SceneParent = defineComponent('SceneParent', { parent: 'f64' });
