using System.Text.Json.Serialization;

namespace BingusLib.FaqHandling
{
    public record FaqConfig
    {
        public record FaqConfigEntry
        {
            [JsonPropertyName("title")] public string Title { get; set; } = "";

            [JsonPropertyName("answer")] public string Answer { get; set; } = "";

            [JsonPropertyName("matched_questions")]
            public List<string> Questions { get; set; } = new();

            public FaqConfigEntry()
            {
            }

            public FaqConfigEntry(string answer) : this()
            {
                Answer = answer;
            }

            public FaqConfigEntry(string answer, IEnumerable<string> questions) : this(answer)
            {
                Questions.AddRange(questions);
            }
        }

        [JsonPropertyName("average_questions")]
        public bool AverageQuestions { get; set; } = false;

        [JsonPropertyName("faqs")] public List<FaqConfigEntry> FaqEntries { get; set; } = new();

        public FaqConfigEntry? GetAnswerEntry(string answer)
        {
            foreach (var entry in FaqEntries)
            {
                if (entry.Answer == answer) return entry;
            }

            return null;
        }

        public IEnumerable<(string, string, string)> QaEntryEnumerator()
        {
            foreach (var entry in FaqEntries)
            {
                foreach (var question in entry.Questions)
                {
                    yield return (entry.Title, question, entry.Answer);
                }
            }
        }
    }
}
