import { computed, defineComponent, h } from 'vue';
import { resolveTagAppearance } from './appearance.js';

/**
 * The badge the tag syntax compiles to. Styled by `style.css`; written as a
 * render function rather than an SFC so the package builds with plain tsup.
 */
export const MarkdownTag = defineComponent({
  name: 'MarkdownTag',
  props: {
    /** Text shown in the tag. A few labels, such as `done`, also pick a color. */
    label: { type: String, required: true },
    /** Background: a palette name (`green`) or a hex code (`#7a5add`). */
    bgcolor: { type: String, default: '' },
    /** Text color as a hex code. */
    fgcolor: { type: String, default: '' },
    /** Render with a pointed, price-tag shape. */
    arrow: { type: Boolean, default: false },
  },
  setup(props) {
    const appearance = computed(() => resolveTagAppearance(props));
    return () => {
      const { classes, style } = appearance.value;
      // Omit `style` entirely when empty: Vue's SSR would otherwise emit `style=""`.
      const attributes = Object.keys(style).length ? { class: classes, style } : { class: classes };
      return h('span', attributes, props.label);
    };
  },
});
