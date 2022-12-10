import { ThemeProvider } from "@emotion/react";
import {
  Button,
  Card,
  Container,
  createTheme,
  CssBaseline,
  Paper,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { bake_cookie, read_cookie } from "sfcookies";
import "./App.css";

function App() {
  const cookieTheme = read_cookie("user-theme");
  const systemDarkMode = useMediaQuery("(prefers-color-scheme: dark)");

  const [prefersDarkMode, setPrefersDarkMode] = useState(
    cookieTheme.length ? cookieTheme === "dark" : systemDarkMode
  );

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: prefersDarkMode ? "dark" : "light",
        },
      }),
    [prefersDarkMode]
  );

  const [input, setInput] = useState("");
  const [lastResults, setLastResults] = useState<
    [{ relevance: number; title: string; text: string }] | null
  >(null);
  const [lastSearchInput, setLastSearchInput] = useState("");

  const queryBingus = async (query: string, responseCount: number = 5) => {
    const url = new URL("https://bingus.bscotch.ca/api/faq/search");

    url.search = new URLSearchParams({
      question: query,
      responseCount: responseCount.toFixed().toString(),
    }).toString();

    return fetch(url).then((response) => response.json());
  };

  const search = async () => {
    if (input === lastSearchInput) {
      return;
    }

    if (!input || !/\S/.test(input)) {
      setLastResults(null);
      setLastSearchInput(input);
      return;
    }

    const results = await queryBingus(input);
    setLastResults(results);
    setLastSearchInput(input);
  };

  const toggleTheme = async () => {
    setPrefersDarkMode((value) => {
      const newValue = !value;
      bake_cookie("user-theme", newValue ? "dark" : "light");
      return newValue;
    });
  };

  const relevanceToElevation = function (
    relevance: number | null,
    scale: number = 24
  ): number {
    if (relevance) {
      return Math.round((relevance / 100) * scale);
    }

    return 0;
  };

  const resultCard = function (text: string, relevance: number | null = null) {
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
              <Typography variant="caption">{relevance.toFixed()}%</Typography>
            </Card>
          ) : (
            <></>
          )}
          <Typography
            paragraph
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

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      <Stack alignItems="end" direction="column-reverse" sx={{ padding: 2 }}>
        <Button variant="contained" onClick={toggleTheme}>
          {prefersDarkMode ? "Dark" : "Light"}
        </Button>
      </Stack>

      <Container component="main" maxWidth="md">
        <Paper sx={{ padding: 1 }}>
          <Typography fontSize={64} fontFamily="Ubuntu" align="center">
            Bingus Search
          </Typography>
        </Paper>

        <Stack spacing={1} direction="row" sx={{ my: 2 }}>
          <TextField
            fullWidth
            label="Ask a question..."
            variant="filled"
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter") search();
            }}
          />
          <Button onClick={search} variant="contained">
            Search
          </Button>
        </Stack>

        <Paper variant="elevation" sx={{ padding: 1.5 }}>
          <Stack spacing={1.5} alignItems="center" direction="column">
            {lastResults?.length
              ? lastResults
                  ?.sort((a, b) => (a.relevance <= b.relevance ? 1 : -1))
                  .map((result) => resultCard(result.text, result.relevance))
              : resultCard("No results...")}
          </Stack>
        </Paper>
      </Container>
    </ThemeProvider>
  );
}

export default App;
