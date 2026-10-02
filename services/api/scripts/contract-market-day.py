"""为深层市场日数据增加可生成的正向分支，保留完整原随机策略。"""

from copy import deepcopy

from hypothesis import strategies as st
from schemathesis.generation import GenerationMode


def market_day_strategy(payloads):
    # as_strategy再次进入同一个hook时仅跳过辅助分支，保留官方元信息构造。
    building = False

    def before_generate_case(context, strategy):
        nonlocal building
        operation = context.operation
        if (
            building
            or operation.method.upper() != "PUT"
            or operation.path != "/v1/internal/markets/days/{date}"
        ):
            return strategy

        def assisted(payload):
            nonlocal building
            building = True
            try:
                return operation.as_strategy(
                    generation_mode=GenerationMode.POSITIVE,
                    body=deepcopy(payload),
                    media_type="application/json",
                    path_parameters={"date": payload["day"]["date"]},
                )
            finally:
                building = False

        # 原strategy不映射、不筛选、不替换；负向case及其meta原样通过。
        samples = st.sampled_from(payloads).flatmap(assisted)
        return st.one_of(strategy, samples)

    return before_generate_case
