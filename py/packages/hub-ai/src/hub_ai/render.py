"""提示词只渲染两节；替换一次，保留事实包原始键顺序。"""

import json
import re
from typing import Any


def render_prompt(template: str, inputs: dict[str, Any]) -> dict[str, str]:
    sections: dict[str, str] = {}
    matches = list(re.finditer(r"^## ([^\n]+)\n", template, re.M))
    for index, match in enumerate(matches):
        name = match[1].strip()
        if name not in {"system", "user"}:
            continue
        end = matches[index + 1].start() if index + 1 < len(matches) else len(template)
        body = re.sub(r"<!--.*?-->", "", template[match.end() : end], flags=re.S).strip()

        def substitute(found: re.Match[str]) -> str:
            value = inputs.get(found[1])
            if value is None or value == "" or value == [] or value == {}:
                return "（无）"
            if isinstance(value, str):
                return value
            return json.dumps(value, ensure_ascii=False, indent=2)

        sections[name] = re.sub(r"\{\{ ([A-Za-z][A-Za-z0-9_]*) \}\}", substitute, body)
    if set(sections) != {"system", "user"}:
        raise ValueError("提示词必须包含 system 与 user 两节")
    return sections
