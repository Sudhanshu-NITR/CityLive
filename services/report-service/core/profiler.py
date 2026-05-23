# services/report-service/core/profiler.py
import statistics
import statistics

class LatencyProfiler:
    def __init__(self):
        # A dictiionary mapping operation name -> list of latency values
        self._samples = {}

    def record(self, operation: str, latency_ms: float):
        """Store one latency measurement for a named operation."""
        if operation not in self._samples:
            self._samples[operation] = []
        self._samples[operation].append(latency_ms)

    def report(self):
        """Print a summary table of p50, p95, p99 for all recorded operations."""
        print("\n=== LATENCY REPORT ===")
        for op, samples in self._samples.items():
            if len(samples) < 2:
                print(f"  {op}: only {len(samples)} sample(s), not enough for percentiles")
                continue
            sorted_s = sorted(samples)
            p50 = statistics.median(sorted_s)
            p95 = sorted_s[int(len(sorted_s) * 0.95)]
            p99 = sorted_s[int(len(sorted_s) * 0.99)]
            print(f"  {op}: n={len(samples)}  p50={p50:.0f}ms  p95={p95:.0f}ms  p99={p99:.0f}ms")
        print("======================\n")

# Module-level singleton — imported and shared across the whole app
profiler = LatencyProfiler()
