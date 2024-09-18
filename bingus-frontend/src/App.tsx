import { ThemeProvider } from "@emotion/react";
import {
  Alert,
  Button,
  Card,
  CircularProgress,
  Container,
  createTheme,
  CssBaseline,
  Link,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./App.css";

export type Result = {
  relevance: number;
  matchedQuestion: string;
  title: string;
  text: string;
};

function App() {
  const localTheme = localStorage.getItem("user-theme");
  const systemDarkMode = matchMedia("(prefers-color-scheme: dark)");

  const [prefersDarkMode, setPrefersDarkMode] = useState(
    localTheme ? localTheme === "dark" : systemDarkMode.matches,
  );
  if (!localTheme) {
    systemDarkMode.onchange = (ev) => {
      !localStorage.getItem("user-theme") &&
        setPrefersDarkMode(() => ev.matches);
    };
  }

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: prefersDarkMode ? "dark" : "light",
        },
      }),
    [prefersDarkMode],
  );

  const url = new URL(window.location.href);
  const urlInput = url.searchParams.get("q") ?? "";

  const urlInputSearched = useRef(false);
  const [input, setInput] = useState(urlInput);
  const [lastResults, setLastResults] = useState<Result[] | null>(null);
  const [lastSearchInput, setLastSearchInput] = useState("");
  const [loadingResults, setLoadingResults] = useState(false);

  const updateUrl = function () {
    window.history.replaceState({}, window.name, url.toString());
  };

  const queryBingus = async (query: string, responseCount = 30) => {
    const url = new URL("https://bingus.slimevr.io/faq/search");

    setLoadingResults(true);

    url.search = new URLSearchParams({
      question: query,
      responseCount: responseCount.toFixed().toString(),
    }).toString();

    return fetch(url)
      .then((response) => response.json())
      .finally(() => setLoadingResults(false));
  };

  const search = async () => {
    if (input === lastSearchInput) {
      return;
    }

    // Clear last search results
    setLastResults(null);

    if (!input || !/\S/.test(input)) {
      setLastResults(null);
      setLastSearchInput(input);

      url.searchParams.delete("q");
      updateUrl();

      return;
    }

    url.searchParams.set("q", input);
    updateUrl();

    const results = await queryBingus(input);
    setLastResults(results);
    setLastSearchInput(input);
  };

  if (!urlInputSearched.current) {
    urlInputSearched.current = true;
    search();
  }

  const toggleTheme = async () => {
    setPrefersDarkMode((value) => {
      const newValue = !value;
      localStorage.setItem("user-theme", newValue ? "dark" : "light");
      return newValue;
    });
  };

  const relevanceToElevation = function (
    relevance: number | null,
    scale = 24,
  ): number {
    if (relevance) {
      return Math.round((relevance / 100) * scale);
    }

    return 0;
  };

  const resultCard = function (relevance: number, title: string, text: string) {
    const relevanceElevation = relevanceToElevation(relevance, 6);

    return (
      <Card
        variant="elevation"
        elevation={2 + relevanceElevation}
        sx={{ width: "100%" }}
      >
        <Stack padding={1.25} spacing={1.75} direction="row">
          {relevance !== null ? (
            <Card
              variant="elevation"
              elevation={3 + relevanceElevation}
              sx={{
                width: "fit-content",
                height: "fit-content",
                padding: 0.75,
              }}
            >
              <Typography variant="caption" noWrap>
                {relevance.toFixed()}%
              </Typography>
            </Card>
          ) : (
            <></>
          )}
          <Typography
            component="p"
            variant="body1"
            sx={{
              width: "fit-content",
              height: "fit-content",
              margin: 0,
            }}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
          </Typography>
        </Stack>
      </Card>
    );
  };

  const results = function () {
    return lastResults?.length ? (
      lastResults
        .sort((a, b) => (a.relevance <= b.relevance ? 1 : -1))
        .map((result) =>
          resultCard(result.relevance, result.title, result.text),
        )
    ) : (
      <Typography color="text.secondary" padding={1}>
        No results...
      </Typography>
    );
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      <Container
        maxWidth="md"
        component="main"
        className={prefersDarkMode ? "dark" : ""}
      >
        <Stack spacing={1} direction="row" sx={{ my: 2 }}>
          <Alert variant="outlined" severity="info" sx={{ flexGrow: 1 }}>
            <Typography>
              This site may not provide up-to-date information. If you need any
              further help, join the SlimeVR Discord at{" "}
              <Link href="https://discord.gg/SlimeVR">
                https://discord.gg/SlimeVR
              </Link>
              .
            </Typography>
          </Alert>
          <Button
            variant="contained"
            onClick={toggleTheme}
            sx={{ width: "fit-content", height: "fit-content" }}
          >
            {prefersDarkMode ? "Dark" : "Light"}
          </Button>
        </Stack>

        <Container disableGutters>
          <Typography
            noWrap
            fontFamily="Ubuntu"
            align="center"
            sx={{ typography: { md: "h2", sm: "h3", xs: "h4" } }}
          >
            Bingus Search
          </Typography>

          <Stack spacing={1} direction="row" sx={{ my: 2 }}>
            <TextField
              fullWidth
              label="Ask a question..."
              autoFocus
              value={input}
              variant="filled"
              onChange={(e) => setInput(e.target.value)}
              onKeyUp={(e) => {
                if (e.key === "Enter") search();
              }}
            />
            <Button onClick={search} variant="contained">
              Search
            </Button>
          </Stack>

          <Paper variant="elevation" sx={{ padding: 1.5 }}>
            <Stack spacing={1.5} alignItems="center" direction="column">
              {loadingResults ? (
                <CircularProgress
                  thickness={5.5}
                  size={64}
                  sx={{ padding: 1 }}
                />
              ) : (
                results()
              )}
            </Stack>
          </Paper>
        </Container>
      </Container>
    </ThemeProvider>
  );
}

export default App;
