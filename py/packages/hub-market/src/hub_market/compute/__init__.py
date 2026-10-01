"""T21纯计算入口；文件与网络IO由调用方提供。"""

from .day import Computed, assemble, complete_day, compute, day_summary
from .indices import bars
from .input import ComputeInput

__all__ = ["ComputeInput", "Computed", "assemble", "bars", "complete_day", "compute", "day_summary"]
