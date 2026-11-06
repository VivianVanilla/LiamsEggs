// Creature.exe: starts the game. Double-click it, or pin it to the taskbar: start the game with it,
// right-click Creature on the taskbar, and choose Pin to taskbar.
//
//   Creature.exe                 plays the world in world\
//   Creature.exe liam            plays worlds\liam (see "Worlds on their own branches" in the README)
//   Creature.exe --creature=feed opens a note in the running game, like the jump list does
//
// It is only a launcher: it starts the Electron that npm install put in node_modules, with this
// folder as the app. Built by tools/build-exe.cjs (npm run exe).

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Text;
using System.Text.RegularExpressions;
using System.Windows.Forms;

[assembly: AssemblyTitle("Creature")]
[assembly: AssemblyProduct("Creature")]
[assembly: AssemblyDescription("Starts the Creature game")]
[assembly: AssemblyVersion("1.0.0.0")]

static class Launcher
{
    [STAThread]
    static int Main(string[] args)
    {
        // The folder this exe is in, without a trailing backslash, which would escape a closing quote.
        string root = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location).TrimEnd('\\', '/');
        string electron = Path.Combine(root, "node_modules", "electron", "dist", "electron.exe");
        if (!File.Exists(electron))
        {
            MessageBox.Show(
                "Creature needs its parts installed before it can start.\n\n" +
                "Open a terminal in this folder and run:\n\n    npm install\n\nThen start Creature again.",
                "Creature", MessageBoxButtons.OK, MessageBoxIcon.Information);
            return 1;
        }

        string world = null;
        var pass = new List<string>();
        foreach (string a in args)
        {
            // Only the game's own switches go through, never anything else for Electron to act on.
            if (Regex.IsMatch(a, "^--creature=[a-z:]{1,30}$")) pass.Add(a);
            else if (world == null && Regex.IsMatch(a, "^[A-Za-z0-9_-]{1,40}$")) world = a.ToLowerInvariant();
        }

        var psi = new ProcessStartInfo(electron) { UseShellExecute = false, WorkingDirectory = root };
        // Left over from some editors' terminals, it would start Electron as plain Node.
        psi.EnvironmentVariables.Remove("ELECTRON_RUN_AS_NODE");
        psi.EnvironmentVariables["CREATURE_LAUNCHER"] = Assembly.GetExecutingAssembly().Location;
        if (world != null)
        {
            psi.EnvironmentVariables["CREATURE_HOME"] = Path.Combine(root, "worlds", world);
            psi.EnvironmentVariables["CREATURE_WORLD"] = world;
        }
        else
        {
            psi.EnvironmentVariables.Remove("CREATURE_HOME");
            psi.EnvironmentVariables.Remove("CREATURE_WORLD");
        }
        var parts = new List<string> { Quote(root) };
        foreach (string p in pass) parts.Add(Quote(p));
        psi.Arguments = string.Join(" ", parts.ToArray());

        try
        {
            Process.Start(psi);
        }
        catch (Exception err)
        {
            MessageBox.Show("Creature could not start:\n\n" + err.Message, "Creature", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            return 1;
        }
        return 0;
    }

    // One argument, quoted the way Windows programs read their command line back.
    static string Quote(string s)
    {
        if (s.Length > 0 && s.IndexOfAny(new[] { ' ', '\t', '"' }) < 0) return s;
        var sb = new StringBuilder("\"");
        int slashes = 0;
        foreach (char ch in s)
        {
            if (ch == '\\')
            {
                slashes++;
                continue;
            }
            if (ch == '"')
            {
                sb.Append('\\', slashes * 2 + 1);
                sb.Append('"');
            }
            else
            {
                sb.Append('\\', slashes);
                sb.Append(ch);
            }
            slashes = 0;
        }
        sb.Append('\\', slashes * 2);
        sb.Append('"');
        return sb.ToString();
    }
}
