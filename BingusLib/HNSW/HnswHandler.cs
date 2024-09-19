using HNSW.Net;
using MathNet.Numerics.LinearAlgebra;

namespace BingusLib.HNSW
{
    public class HnswHandler
    {
        private readonly SmallWorld<ILazyItem<float[]>, float>.Parameters _hnswParameters;
        private readonly WrappedDistance<ILazyItem<float[]>, float[], float> _distanceFunction;

        private readonly SmallWorld<ILazyItem<float[]>, float> _hnswGraph;

        public HnswHandler(
            Func<float[], float[], float>? distanceFunction = null,
            SmallWorld<ILazyItem<float[]>, float>.Parameters? parameters = null
        )
        {
            _distanceFunction = new(i => i.Value, distanceFunction ?? CosineDistance.SIMD);
            _hnswParameters = parameters ?? new();
            _hnswGraph = new(
                _distanceFunction.WrappedDistanceFunc,
                DefaultRandomGenerator.Instance,
                _hnswParameters
            );
        }

        public void AddItems(params ILazyItem<float[]>[] items)
        {
            _hnswGraph.AddItems(items);
        }

        public void AddItems(
            IProgressReporter? progressReporter = null,
            params ILazyItem<float[]>[] items
        )
        {
            _hnswGraph.AddItems(items, progressReporter);
        }

        public void AddItems(
            IReadOnlyList<ILazyItem<float[]>> items,
            IProgressReporter? progressReporter = null
        )
        {
            _hnswGraph.AddItems(items, progressReporter);
        }

        public IList<SmallWorld<ILazyItem<float[]>, float>.KNNSearchResult> SearchItems(
            ILazyItem<float[]> item,
            int numResults
        )
        {
            return _hnswGraph.KNNSearch(item, numResults);
        }

        public IList<SmallWorld<ILazyItem<float[]>, float>.KNNSearchResult> SearchItems(
            float[] item,
            int numResults
        )
        {
            return SearchItems(new LazyItemValue<float[]>(item), numResults);
        }

        public IList<SmallWorld<ILazyItem<float[]>, float>.KNNSearchResult> SearchItems(
            Vector<float> item,
            int numResults
        )
        {
            return SearchItems(item.AsArray() ?? item.ToArray(), numResults);
        }
    }
}
