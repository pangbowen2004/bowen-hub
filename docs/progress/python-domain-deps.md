# 计算平面领域依赖

按docs01既定栈为hub-providers与hub-market声明Polars，并更新uv锁文件（1.44.2）。用于TuShare原始Parquet、缓存与后续指标计算；未新增服务或改选型，不改业务代码。

setup、uv add、check、test均退出0（TS668、Python176）；Python3.14环境真实安装Polars运行时。T10同一pyproject还有来源解析依赖，根合并时保留双方清单并重新生成锁文件。
