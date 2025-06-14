import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { UploadPage } from "@/pages/upload";
import { SelectDayPage } from "@/pages/select-day";
import { EditWorkoutPage } from "@/pages/edit-workout";
import { SummaryPage } from "@/pages/summary";
import { DBTestPage } from "@/pages/db-test";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={UploadPage} />
      <Route path="/select-day" component={SelectDayPage} />
      <Route path="/edit-workout" component={EditWorkoutPage} />
      <Route path="/summary" component={SummaryPage} />
      <Route path="/db-test" component={DBTestPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster />
      <Router />
    </QueryClientProvider>
  );
}

export default App;
