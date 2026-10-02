# 第6波有限共享路径登记

只读准备发现T41真实MCP鉴权需要检查当前授权，单独验证已签JWT不能体现T40撤销；官方Inspector验收需要现有Playwright配置接入独立本地OAuth项目。T51真实迁移命令实现后，也需要替换共享CLI测试的两个旧占位断言。

本次只在任务图登记有限sharedEdits：MCP当前授权helper及其测试、Inspector专用验收目录与有限配置接线、T51两条CLI旧占位断言。没有实现MCP/迁移业务、修改鉴权表/登录行为、契约、质量阈值、模型或预算，也不提前开工第6波；必须等第5波正式任务全部合并。其他测试项目、断言和路径所有权规则保留。

T41复用锁定SDK2.2/Inspector2.9及真实Better Auth OAuth。技术虚拟认证器验收不冒称Kevin个人通行密钥或Claude验收。T51只读旧数据映射结果和实际生产API当前0日频/0假设预检保留于根记录，不在本次写入业务数据。

验证使用现有正式loadGraph和checkOwnership加载本次真实任务图：31项任务，除T41/T51有限sharedEdits外其余所有任务及元数据逐项相同。6个实际正负路径检查通过；未登记的auth/runtime.ts、原auth/real.spec.ts及T51 eod/service.py仍被拒绝。`/tmp/bowen-wave6-shared-scopes-validation.log`，退出0；git diff --check退出0。文档/路径登记不新增实现镜像测试，完整正式CI仍由根验收。
