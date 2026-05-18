import { RssAdapter } from './rss'

/**
 * 微信公众号RSS适配器
 * 本质上是RSS适配器，但会在来源名称上标注为公众号
 * 用户需要通过第三方服务（如 wechat2rss、feeddd 等）获取公众号的RSS地址
 */
export class WechatRssAdapter extends RssAdapter {
  // 行为与 RssAdapter 完全相同
  // 差异在 manager.ts 中通过 source.type 来区分展示
}
