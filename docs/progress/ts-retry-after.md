# TypeScript限流等待

真实问答在上游连续三次429后返回502。共享TS运行时先前固定1/2秒退避，现只对429读取有效Retry-After，十进制秒数或标准HTTP日期，最多60秒；普通和未发布流仍至多三次，发布正文后不重试。SDK自身重试仍0，错误信息保持固定安全文案，不带供应商正文。

新增真实SDK fetch回放覆盖generate/stream的429与500，确认等待保留且SDK没有额外重试；运行时有界等待、无效数值、不存在日期、已发布后不重试回归。独立审查发现宽松Number/Date.parse会接受无效header，已修并复审通过。AI68测试通过，完整mise check通过，diffcheck0。原生论文适配器由T32在此平台修复合入后接入共享函数，不能冒称本PR已修改原生入口。Python此前已支持秒数限流等待，本PR未改变Python行为。

日志 /tmp/bowen-ts-retry-tests-final.log、/tmp/bowen-ts-retry-check.log。等待独立PR CI；不以一次成功请求替代真实质量评测。
