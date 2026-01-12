# Artillery load test for justchat.space

Prerequisites: Node.js + npm available. You can run without a global install using `npx`.

Run the load test (this will take ~7 minutes):

```powershell
npx -y artillery run "monitoring/artillery/justchat-loadtest.yml" -o "monitoring/artillery/report.json"
npx -y artillery run "monitoring/artillery/justchat-loadtest.yml" --record --key a9_b2u1e0imzioem9otm7m7m8tvvp94blgp
# Generate an HTML report from the JSON result
npx -y artillery report "monitoring/artillery/report.json" --output "monitoring/artillery/report.html"
```

Notes:

- The YAML ramps arrival rate to 300 and sustains for 5 minutes. Adjust the `phases` in the YAML if you want a different profile.
- The test hits the site root and a couple static assets; extend `scenarios` to cover API routes or websocket flows if needed.
