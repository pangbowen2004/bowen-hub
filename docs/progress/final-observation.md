# 收尾观察 · 2026-10-07
- 延续实际上线起点2026-10-07T00:18:19.228351Z，本次前端收尾不重置14天观察；最早10/21同一时刻满14天。
- 现有Cloudflare Worker每10分钟检查业务产出，每小时读回站点状态并记录D1；失败邮件去重，当天失败保留。
- 10/7 21:30新加坡实际production-observation检查problems=[]；六业务workflow均active，评测及探测继续停用。
- 10/7盘前：Cloudflare20:50:06派发，workflow_dispatch运行37623885818成功；premarket-2026-10-07已归档，8项中文、正文942字，SMTP20:55:25接收。
- 10/8 A股收盘（17:05起）、10/12周报（随07:10早报）待真实运行，未提前计入成功；本人收件箱与阅读耗时待验证。
- 每日23:15辅助核对沿用现有任务；实际版次、SMTP、中文质量与全部活跃行情分开记录，后来的成功不抹去失败。
- 10/21核对真实14天记录后交老Daily News、老观测台、老论文站停用清单；Kevin确认前保持旧系统运行。

## 10月8日晨间实际核对
- Cloudflare03:30:42派发备份37675036891、07:10:28派发早报37700714484，两条workflow_dispatch成功且D1记录相互印证；未手动重跑。
- morning-2026-10-08于07:19:41获SMTP接收，5项个股及5项国际摘要逐项核对为中文，30/30活跃自选行情数值有效；五期窗口已记录2期，收件箱与阅读耗时仍待本人验证。
- 六项业务workflow均active，evals-weekly和schedule-probe保持停用；10/7与10/8真实production-observation均problems=[]，起点不变，未提前计满14天。
- CNBC403、Nasdaq与国债收益率超时、VentureBeat429、36氪解析失败延续上期，失败保留；没有新增来源故障，不把工作流绿灯写成所有来源均正常。
- 10/8 A股收盘17:05起、当晚盘前及10/12周报待实际运行；凌晨正常窗口外跳过不算当天收盘或盘前成功。

## 10月8日晚间实际核对
- 23:26新加坡只读核对：六项业务workflow均active；evals-weekly、schedule-probe继续停用，过去24小时已完成的GitHub运行无新增失败。
- A股收盘：Cloudflare19:41:17派发[37771708198](https://github.com/pangbowen2004/bowen-hub/actions/runs/37771708198)，19:42完整产出，D1 complete=1、missing=[]、16方向；前四次缺方向的阶段产出保留，不计为完整收盘。
- 自动[生产部署37771844023](https://github.com/pangbowen2004/bowen-hub/actions/runs/37771844023)19:47成功，正式首页为10/8“普跌收缩，广度与量能同步转弱”，与930611ba部署内容一致；未手动派发或重跑。
- 盘前：Cloudflare20:51:24派发[37779894633](https://github.com/pangbowen2004/bowen-hub/actions/runs/37779894633)，premarket-2026-10-08于20:56:52获SMTP接收，8项有效中文消息、正文972字；另1项明确无直接消息，校验失败的内容丢弃，未回退英文。
- Cloudflare23:21实际clock-daily四项均已产出；23:11 production-observation problems=[]，10/7观察起点不变；两公开首页HTTP200，论文首页仍为范围B的87项研究。
- 五期早报仍为10/7–11中的2/5，10/12周报待正常运行；本人收件箱、新闻≤10分钟、收盘≤3分钟及论文≤30秒均待本人验证，既有来源故障和迟到记录不覆盖。

## 10月9日实际核对
- 23:13新加坡只读核对六项业务workflow均active，evals-weekly、schedule-probe继续停用；过去24小时已完成运行无新增失败。
- Cloudflare03:31:05派发[备份37832550005](https://github.com/pangbowen2004/bowen-hub/actions/runs/37832550005)，03:32已提交远端；07:10:43派发[早报37857953179](https://github.com/pangbowen2004/bowen-hub/actions/runs/37857953179)，07:19:33获SMTP接收，D1与日志相互印证。
- morning-2026-10-09含9项个股及1项国际中文摘要、正文2261字，30/30活跃行情有效（含BTC、XRP）；五期窗口已记录3/5，后到的GitHub备用定时正常跳过，未重发或覆盖。
- A股[37925269074](https://github.com/pangbowen2004/bowen-hub/actions/runs/37925269074)19:42完整产出、无缺失且16方向齐备；自动[生产37925374883](https://github.com/pangbowen2004/bowen-hub/actions/runs/37925374883)19:46成功，正式首页为10/9“涨跌分化，市场仍在寻找一致方向”，与05df14f6部署一致；早期四份缺方向产出留档。
- Cloudflare20:51:11派发[盘前37932780199](https://github.com/pangbowen2004/bowen-hub/actions/runs/37932780199)，20:56:10获SMTP接收，8项有效中文消息、正文965字，另3项明确无直接消息；校验未通过的内容丢弃，未回退英文。
- 23:11 clock-daily四项均已产出；22:51 production-observation problems=[]，10/7–9实际观察记录保留、起点不变，论文公开范围仍为B的88版本/87研究。
- 五项既有来源故障延续，无新增来源故障；10/12新闻周报及本人收件、阅读耗时待验证，正式29/31不变，未重跑业务、CI或评测，旧系统继续保留。

## 10月10日实际核对
- 23:14新加坡只读核对六项业务workflow均active，evals-weekly、schedule-probe继续停用；过去24小时已完成运行无新增失败。
- Cloudflare03:31:33派发[备份37980822679](https://github.com/pangbowen2004/bowen-hub/actions/runs/37980822679)，03:33已提交远端；07:10:42派发[早报38003098895](https://github.com/pangbowen2004/bowen-hub/actions/runs/38003098895)，07:19:39获SMTP接收，D1与实际日志相互印证。
- morning-2026-10-10含7项个股及3项国际中文摘要、正文2184字，30/30活跃行情有效（含BTC、XRP）；五期窗口已记录4/5，两个后到的GitHub备用定时正常跳过，未重发或覆盖。
- 交易日历确认10/10为周六，A股休市、美股无开盘；凌晨收盘为非交易日跳过，盘前为时间窗外跳过，不记漏跑，10/12新闻周报仍待周一早报正常运行。
- 两公开首页HTTP200，A股保留10/9完整收盘、16方向，正式页面与05df14f6部署一致；论文首页为范围B的87项研究，88份可读版本范围不变。
- 23:11 clock-daily早报、备份均已产出；22:41 production-observation problems=[]，10/7–10实际观察记录保留，起点不变，未提前计满14天。
- 五项既有来源故障延续，无新增来源故障；校验未通过的内容丢弃，未回退英文；本人收件和阅读耗时待验证，正式29/31不变，未手动触发业务、CI或评测，旧系统继续保留。

## 10月11日实际核对
- 23:18新加坡只读核对六项业务workflow均active，evals-weekly、schedule-probe继续停用；过去24小时已完成运行均成功，内容质量另行核对。
- Cloudflare03:31:04派发[备份38080117334](https://github.com/pangbowen2004/bowen-hub/actions/runs/38080117334)，03:32提交远端；07:10:39派发[早报38094108229](https://github.com/pangbowen2004/bowen-hub/actions/runs/38094108229)，07:15:18获SMTP接收，D1与日志相互印证。
- morning-2026-10-11含5项有效个股及9项国际中文摘要、正文2206字；另2项明确无直接消息，不计为新闻，未回退英文。
- 新增内容缺失：本版次没有收盘快照，30只活跃自选行情全部未展示（快照0/30，不是涨跌为0）；Alpaca日线最后检查停在10/10早报，并非本次请求行情失败。
- 根因是沿用旧周末规则：实际窗口离线回放为weekend，采集及组稿均跳过快照；周一lookahead也被同一规则排除。缺失已记录并通知，修复尚未实施，不补跑或覆盖已发送版次。
- 固定10/7–11五期全部留档、按时获SMTP接收；完整行情仅前四期达标，不能宣布五期验收通过；本人实际收件及阅读耗时仍待验证。
- 周日A股休市、美股无开盘；两公开首页HTTP200，A股保留10/9完整收盘、16方向且与05df14f6部署一致，论文保持范围B的88版本/87研究。
- Cloudflare23:11 clock-daily早报、备份已产出，23:01 production-observation problems=[]；这些检查未覆盖行情内容，不能据此抹去上述失败，10/7观察起点不变。
- 五项既有来源故障延续；10/12周报待周一早报真实运行，正式29/31不变，未手动触发业务、CI或部署，旧系统继续保留。

## 10月12日实际核对
- 23:18新加坡只读核对六项业务workflow均active，evals-weekly、schedule-probe继续停用；已发送版次的备用定时正常跳过。
- Cloudflare03:31:07派发[备份38168362407](https://github.com/pangbowen2004/bowen-hub/actions/runs/38168362407)，03:32提交远端；07:10:36派发[早报38183288792](https://github.com/pangbowen2004/bowen-hub/actions/runs/38183288792)，07:15:27获SMTP接收，8项有效个股及7项国际中文摘要、正文2222字，另4项明确无直接消息。
- 同一早报运行内的weekly-2026-10-12于07:57:04获SMTP接收，7项个股及5项国际中文摘要、正文3687字；28只股票/ETF周涨跌有效，BTC/XRP无周行情，未把周报记为独立cron派发。
- 周一早报仍缺收盘快照，延续10/11已通知的weekend/lookahead旧规则问题；不补跑覆盖，固定10/7–11五期完整行情仍4/5，本人收件及阅读耗时待验证。
- A股[38243232562](https://github.com/pangbowen2004/bowen-hub/actions/runs/38243232562)19:32完整产出、无缺失且16方向齐备；自动[生产38243331653](https://github.com/pangbowen2004/bowen-hub/actions/runs/38243331653)19:37成功，正式首页为10/12“普跌收缩，广度与量能同步转弱”，与e389b288部署一致；此前四份缺方向产出留档。
- 新失败：[盘前38252811125](https://github.com/pangbowen2004/bowen-hub/actions/runs/38252811125)由Cloudflare21:01派发，21:06归档阶段请求失败，生成4项中文、649字但sent=false，D1无当日盘前版次；不是已确认的邮件服务器故障。
- Cloudflare21:32记录截止缺产出并发告警，22:41 production-observation problems=[news-premarket]；失败保留，10/7观察起点不变，不能称连续正常或提前停旧。
- 业务日志仅保留SourceRequestError类型，具体接口/HTTP状态未确认；现有令牌查询Cloudflare日志返回403，需本人补日志查询权限后继续定位，不把该403当成盘前业务HTTP状态，未过窗重跑。
- 两公开首页HTTP200，论文范围B88版本/87研究保持；五项既有来源故障延续，正式29/31不变，今日仅只读核对与文档提交，未派发CI、评测或部署。

## 10月13日实际核对
- 23:19新加坡只读核对六项业务workflow均active，evals-weekly、schedule-probe继续停用；过去24小时已完成GitHub运行没有新增失败。
- Cloudflare03:31:08派发[备份38298185876](https://github.com/pangbowen2004/bowen-hub/actions/runs/38298185876)，03:33提交远端；07:10:46派发[早报38320753651](https://github.com/pangbowen2004/bowen-hub/actions/runs/38320753651)，07:19:30获SMTP接收，D1与实际日志相互印证。
- morning-2026-10-13含4项个股及7项国际中文摘要、正文2498字，30/30活跃行情数值有效（含BTC/XRP）；本期在固定10/7–11窗口之后，不替换第五期缺行情，原窗口仍4/5未通过。
- A股[38389713633](https://github.com/pangbowen2004/bowen-hub/actions/runs/38389713633)19:23完整产出、16方向无缺失；自动[生产38389842945](https://github.com/pangbowen2004/bowen-hub/actions/runs/38389842945)19:28成功，正式10/13首页为“涨跌分化，市场仍在寻找一致方向”，与7a4444eb部署一致；凌晨未齐检查及四份缺方向产出留档。
- Cloudflare20:55:35派发[盘前38400944433](https://github.com/pangbowen2004/bowen-hub/actions/runs/38400944433)，premarket-2026-10-13于21:03:18获SMTP接收，7项有效中文消息、819字，另1项明确无直接消息；未回退英文。
- 23:11 clock-daily四项均已产出，production-observation problems=[]；10/12失败仍保留，今日成功不等于此前归档错误已定位或修复，10/7观察起点不重置，不能计连续14天正常。
- 两公开首页HTTP200，论文范围B88版本/87研究保持；五项既有来源故障延续，无新增来源故障；周报10/12真实记录保留，今天无独立周报应跑，不误报漏跑。
- 第四个交易日内容及实际邮件记录已填，本人收件、收盘≤3分钟、新闻≤10分钟和论文≤30秒仍待验证；日志权限保持待本人状态，未重复请求或重试被拒查询，正式29/31不变，未重跑业务、CI或评测，旧系统继续保留。

## 10月14日实际核对（沿用当日已取证结果补记）
- 依据10/14 23:12已保存的只读证据补齐记录；六业务workflow均active，evals-weekly、schedule-probe保持停用，过去24小时已完成运行无新增失败，未重跑业务。
- Cloudflare03:41:27派发[备份38456842875](https://github.com/pangbowen2004/bowen-hub/actions/runs/38456842875)，03:43提交远端；07:10:14派发[早报38482573093](https://github.com/pangbowen2004/bowen-hub/actions/runs/38482573093)，07:19:22获SMTP接收。
- morning-2026-10-14含6项有效个股及3项国际中文摘要、正文2224字，另2项无直接消息不计新闻；30/30活跃行情有效（含BTC/XRP），不替换10/7–11窗口失败版次。
- A股[38558263250](https://github.com/pangbowen2004/bowen-hub/actions/runs/38558263250)19:41完整产出、16方向无缺失；自动[生产38558385256](https://github.com/pangbowen2004/bowen-hub/actions/runs/38558385256)19:46成功，正式10/14首页与24db3e39部署一致；早期未齐与四份缺方向产出留档，完成后备用定时正常跳过。
- Cloudflare20:50:30派发[盘前38566925428](https://github.com/pangbowen2004/bowen-hub/actions/runs/38566925428)，20:55:15获SMTP接收，8项有效中文、817字，另3项无直接消息；未回退英文。
- 23:10 clock-daily四项已产出、production-observation problems=[]；两公开首页HTTP200，论文仍88版本/87研究，五项既有来源故障延续；10/12失败及待本人日志权限保留。
- 第五个交易日已填真实产出，本人收件与三个阅读耗时仍待验证；五期完整行情仍4/5，起点保持10/7，不能计连续14天正常或提前停旧，正式29/31不变。

## 10月15日实际核对
- 23:19新加坡只读核对六业务workflow均active，evals-weekly、schedule-probe继续停用；过去24小时已完成运行无新增失败，未恢复或派发工作流。
- Cloudflare03:30:30派发[备份38624260974](https://github.com/pangbowen2004/bowen-hub/actions/runs/38624260974)，03:32提交远端；07:10:30派发[早报38652436707](https://github.com/pangbowen2004/bowen-hub/actions/runs/38652436707)，07:19:19获SMTP接收，D1与日志相互印证。
- morning-2026-10-15含8项有效个股及2项国际中文摘要、正文2427字，另2项仅行情/无消息不计新闻；30/30活跃行情有效（含BTC/XRP），备用定时正常跳过，未覆盖已发送版次。
- A股[38736460721](https://github.com/pangbowen2004/bowen-hub/actions/runs/38736460721)20:41完整产出、16方向无缺失；自动[生产38736598727](https://github.com/pangbowen2004/bowen-hub/actions/runs/38736598727)20:46成功，正式10/15首页与548ecab4部署一致；此前六份缺方向产出保留，后到备用定时正常跳过。
- Cloudflare20:50:30派发[盘前38737753116](https://github.com/pangbowen2004/bowen-hub/actions/runs/38737753116)，20:56:38获SMTP接收，8项有效中文、981字，另2项无直接消息；SMTP不等于本人收件。
- 23:10 clock-daily四项已产出，22:50 production-observation problems=[]；10/12观察失败不抹除，两公开首页HTTP200、论文范围B保持，五项既有来源故障无新增。
- 收件人调整沿用10/15本人指示，未恢复已移除地址；五期完整行情仍4/5，周末快照规则及10/12归档错误未修，日志权限仍待本人，未重复催问。
- 五个交易日的客观产出已填，本人收件及阅读耗时仍待；10/7观察起点不变，正式29/31，旧系统继续保留，未手动重跑业务、CI、评测或部署。

## 10月16日实际核对
- 23:14新加坡只读核对六业务workflow均active，evals-weekly、schedule-probe继续停用；过去24小时已完成GitHub运行无新增失败，未恢复或派发工作流。
- Cloudflare03:30:30派发[备份38794472092](https://github.com/pangbowen2004/bowen-hub/actions/runs/38794472092)，03:32提交远端；07:10:30派发[早报38821960251](https://github.com/pangbowen2004/bowen-hub/actions/runs/38821960251)，07:20:31获SMTP接收，D1与实际日志相互印证。
- morning-2026-10-16含7项个股及3项国际中文摘要、正文2215字，30/30活跃行情有效（含BTC/XRP）；两个后到的备用定时正常跳过，未覆盖已发送版次，也不替换固定五期失败记录。
- A股[38895339211](https://github.com/pangbowen2004/bowen-hub/actions/runs/38895339211)19:41完整产出、16方向无缺失；自动[生产38895459206](https://github.com/pangbowen2004/bowen-hub/actions/runs/38895459206)19:46成功，正式10/16首页与f3c0e749部署一致；此前四份缺方向产出保留，后到备用定时正常跳过。
- Cloudflare20:50:30派发[盘前38903385720](https://github.com/pangbowen2004/bowen-hub/actions/runs/38903385720)，20:55:44获SMTP接收，7项有效中文、873字，另3项无直接消息不计新闻；未回退英文，SMTP不等于本人收件。
- 23:10 clock-daily四项已产出，22:20 production-observation problems=[]；10/12观察失败保留，两公开首页HTTP200、论文范围B88版本/87研究保持，五项既有来源故障无新增。
- 五交易日客观记录已填，本人收件与阅读耗时仍待；五期行情仍4/5，周末快照规则及10/12归档错误未修、日志权限待本人，未重复催问或恢复已移除收件人；10/7观察起点不变，正式29/31，旧系统保留，无业务重跑、手动CI/评测或部署。
