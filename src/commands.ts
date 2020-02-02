import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { GradleTasksTreeDataProvider, GradleTaskTreeItem } from './gradleView';
import {
  stopTask,
  GradleTaskProvider,
  enableTaskDetection,
  stopRunningGradleTasks,
  isTaskRunning
} from './tasks';
import { GradleTasksClient } from './client';
import { getIsTasksExplorerEnabled } from './config';
import { logger } from './logger';

const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../package.json')).toString()
);

function registerRunTaskCommand(
  treeDataProvider: GradleTasksTreeDataProvider
): vscode.Disposable {
  return vscode.commands.registerCommand(
    'gradle.runTask',
    treeDataProvider.runTask,
    treeDataProvider
  );
}

function registerRunTaskWithArgsCommand(
  treeDataProvider: GradleTasksTreeDataProvider
): vscode.Disposable {
  return vscode.commands.registerCommand(
    'gradle.runTaskWithArgs',
    treeDataProvider.runTaskWithArgs,
    treeDataProvider
  );
}

function registerStopTaskCommand(
  statusBarItem: vscode.StatusBarItem
): vscode.Disposable {
  return vscode.commands.registerCommand('gradle.stopTask', task => {
    try {
      if (task && isTaskRunning(task)) {
        stopTask(task);
      }
    } catch (e) {
      logger.error(`Unable to stop task: ${e.message}`);
    } finally {
      statusBarItem.hide();
    }
  });
}

function registerStopTreeItemTaskCommand(): vscode.Disposable {
  return vscode.commands.registerCommand(
    'gradle.stopTreeItemTask',
    treeItem => {
      if (treeItem && treeItem.task) {
        vscode.commands.executeCommand('gradle.stopTask', treeItem.task);
      }
    }
  );
}

function registerRefreshCommand(
  taskProvider: GradleTaskProvider,
  treeDataProvider: GradleTasksTreeDataProvider
): vscode.Disposable {
  return vscode.commands.registerCommand(
    'gradle.refresh',
    async (forceDetection = true): Promise<vscode.Task[] | undefined> => {
      if (forceDetection) {
        enableTaskDetection();
      }
      const tasks = await taskProvider.refresh();
      await treeDataProvider?.refresh();
      if (getIsTasksExplorerEnabled()) {
        vscode.commands.executeCommand(
          'setContext',
          'gradle:showTasksExplorer',
          true
        );
      }
      return tasks;
    }
  );
}

function registerExplorerRenderCommand(
  treeDataProvider: GradleTasksTreeDataProvider
): vscode.Disposable {
  return vscode.commands.registerCommand('gradle.explorerRender', (): void => {
    treeDataProvider.render();
  });
}

function registerExplorerTreeCommand(
  treeDataProvider: GradleTasksTreeDataProvider
): vscode.Disposable {
  return vscode.commands.registerCommand('gradle.explorerTree', () => {
    treeDataProvider!.setCollapsed(false);
  });
}

function registerExplorerFlatCommand(
  treeDataProvider: GradleTasksTreeDataProvider
): vscode.Disposable {
  return vscode.commands.registerCommand('gradle.explorerFlat', () => {
    treeDataProvider!.setCollapsed(true);
  });
}

function registerKillGradleProcessCommand(
  client: GradleTasksClient,
  statusBarItem: vscode.StatusBarItem
): vscode.Disposable {
  return vscode.commands.registerCommand('gradle.killGradleProcess', () => {
    try {
      client.stopGetTasks();
      stopRunningGradleTasks();
      statusBarItem.hide();
    } catch (e) {
      logger.error(`Unable to stop tasks: ${e.message}`);
    }
  });
}

function registerShowProcessMessageCommand(): vscode.Disposable {
  return vscode.commands.registerCommand(
    'gradle.showProcessMessage',
    async () => {
      const OPT_LOGS = 'View Logs';
      const OPT_CANCEL = 'Cancel Process';
      const input = await vscode.window.showInformationMessage(
        'Gradle Tasks Process',
        OPT_LOGS,
        OPT_CANCEL
      );
      if (input === OPT_LOGS) {
        logger.getChannel()?.show();
      } else if (input === OPT_CANCEL) {
        vscode.commands.executeCommand('gradle.killGradleProcess');
      }
    }
  );
}

function registerOpenSettingsCommand(): vscode.Disposable {
  return vscode.commands.registerCommand('gradle.openSettings', (): void => {
    vscode.commands.executeCommand(
      'workbench.action.openSettings',
      `@ext:${packageJson.publisher}.${packageJson.name}`
    );
  });
}

function registerOpenBuildFileCommand(): vscode.Disposable {
  return vscode.commands.registerCommand(
    'gradle.openBuildFile',
    (taskItem: GradleTaskTreeItem): void => {
      vscode.commands.executeCommand(
        'vscode.open',
        vscode.Uri.file(taskItem.task.definition.buildFile)
      );
    }
  );
}

function registerStoppingTreeItemTaskCommand(): vscode.Disposable {
  return vscode.commands.registerCommand('gradle.stoppingTreeItemTask', () => {
    vscode.window.showInformationMessage(`Gradle task is shutting down`);
  });
}

export function registerCommands(
  context: vscode.ExtensionContext,
  statusBarItem: vscode.StatusBarItem,
  client: GradleTasksClient,
  treeDataProvider: GradleTasksTreeDataProvider,
  taskProvider: GradleTaskProvider
): void {
  context.subscriptions.push(
    registerRunTaskCommand(treeDataProvider),
    registerRunTaskWithArgsCommand(treeDataProvider),
    registerStopTaskCommand(statusBarItem),
    registerStopTreeItemTaskCommand(),
    registerRefreshCommand(taskProvider, treeDataProvider),
    registerExplorerTreeCommand(treeDataProvider),
    registerExplorerFlatCommand(treeDataProvider),
    registerKillGradleProcessCommand(client, statusBarItem),
    registerShowProcessMessageCommand(),
    registerOpenSettingsCommand(),
    registerOpenBuildFileCommand(),
    registerStoppingTreeItemTaskCommand(),
    registerExplorerRenderCommand(treeDataProvider)
  );
}