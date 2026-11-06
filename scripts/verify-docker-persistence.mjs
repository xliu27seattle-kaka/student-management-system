import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// This fixed project is disposable and separate from the normal application.
const project = "student-management-verify";
const root = fileURLToPath(new URL("../", import.meta.url));
const base = "http://127.0.0.1:4200";
function docker(args, { capture = false, allowFailure = false } = {}) {
  const result = spawnSync("docker", args, {
    cwd: root,
    encoding: "utf8",
    stdio: capture ? "pipe" : "inherit",
    timeout: 240000,
  });
  if (!allowFailure)
    assert.equal(
      result.status,
      0,
      `docker ${args.join(" ")} failed: ${result.stderr ?? result.error ?? ""}`,
    );
  return result;
}
function compose(...args) {
  return docker(["compose", "-p", project, ...args]);
}
async function api(path, { method = "GET", body, status = 200 } = {}) {
  const response = await fetch(`${base}/api${path}`, {
    method,
    // The stack is recreated below; do not reuse a socket belonging to an old container.
    headers: {
      Connection: "close",
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  const text = await response.text();
  assert.equal(response.status, status, `${method} ${path}: ${text}`);
  return text ? JSON.parse(text) : undefined;
}

// Confirm that requests on 4200 target our disposable project before modifying data.
const container = docker(["compose", "-p", project, "ps", "-q", "frontend"], {
  capture: true,
}).stdout.trim();
assert.ok(
  container,
  "Start the isolated student-management-verify stack first.",
);
const bindings = JSON.parse(
  docker(
    ["inspect", "--format", "{{json .NetworkSettings.Ports}}", container],
    { capture: true },
  ).stdout,
);
assert.ok(
  bindings["80/tcp"]?.some(
    (binding) => binding.HostPort === "4200" && binding.HostIp === "127.0.0.1",
  ),
  "The verification frontend must own localhost:4200.",
);
const courses = await api("/courses?size=100");
assert.equal(
  courses.totalElements,
  10,
  "Use a fresh verification volume with ten seed courses.",
);
assert.ok(
  courses.content.every(
    (course) => course.capacity === 20 && course.enrolledCount === 0,
  ),
);
assert.equal(
  (await api("/students")).totalElements,
  0,
  "The verification volume must have no existing students.",
);
const seed = courses.content.find((course) => course.code === "CS401");
assert.ok(seed);
const student = await api("/students", {
  method: "POST",
  status: 201,
  body: {
    name: "Persistence verification",
    email: "persistence.verify@example.edu",
  },
});
const course = await api("/courses", {
  method: "POST",
  status: 201,
  body: {
    code: "VERIFY-PERSIST",
    name: "Persistence verification course",
    description: "Temporary Docker verification record.",
    capacity: 2,
  },
});
await api(`/students/${student.id}/courses/${course.id}`, {
  method: "POST",
  status: 201,
  body: {},
});
await api(`/courses/${seed.id}`, { method: "DELETE", status: 204 });
console.log("Created a student/course/enrollment and deleted one seed course.");

compose("down");
const volume = `${project}_student-data`;
docker(["volume", "inspect", volume], { capture: true });
compose("up", "-d", "--wait", "--wait-timeout", "180");
assert.equal((await api(`/students/${student.id}`)).email, student.email);
assert.equal((await api(`/courses/${course.id}`)).enrolledCount, 1);
const enrollments = await api(`/students/${student.id}/enrollments`);
assert.equal(enrollments.length, 1);
assert.equal(enrollments[0].course.id, course.id);
await api(`/courses/${seed.id}`, { status: 404 });
assert.equal((await api("/courses")).totalElements, 10);
console.log(
  "PASS: down/up retained records, IDs, enrollment, and the seed deletion.",
);

// Only this explicitly disposable verification volume is removed.
compose("down", "-v");
assert.notEqual(
  docker(["volume", "inspect", volume], { capture: true, allowFailure: true })
    .status,
  0,
);
compose("up", "-d", "--wait", "--wait-timeout", "180");
const reset = await api("/courses?size=100");
assert.equal(reset.totalElements, 10);
assert.ok(
  reset.content.every(
    (item) => item.capacity === 20 && item.enrolledCount === 0,
  ),
);
assert.ok(reset.content.some((item) => item.code === "CS401"));
assert.ok(reset.content.every((item) => item.code !== "VERIFY-PERSIST"));
assert.equal((await api("/students")).totalElements, 0);
console.log(
  "PASS: down -v removed the volume; a fresh start restored only the ten seed courses.",
);
console.log(
  "Docker persistence verification completed; the disposable stack is running with fresh data.",
);
