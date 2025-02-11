/**********************************************************************
 * Copyright (c) 2020-2021 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 ***********************************************************************/
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-null/no-null */
import 'reflect-metadata';

import { Container } from 'inversify';
import { SidecarDockerImage } from '../../src/sidecar/sidecar-docker-image';

describe('Test Sidecar', () => {
  let container: Container;

  let sidecarDockerImage: SidecarDockerImage;

  const mockedConsoleWarn = jest.fn();

  beforeEach(async () => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
    console.warn = mockedConsoleWarn;
    container = new Container();
    container.bind(SidecarDockerImage).toSelf().inSingletonScope();
    sidecarDockerImage = await container.getAsync(SidecarDockerImage);
  });

  test('basics', async () => {
    await sidecarDockerImage.init();
    const result = await sidecarDockerImage.getDockerImageFor('go');
    expect(result).toContain('quay.io/eclipse/che-plugin-sidecar:go-');
    expect(sidecarDockerImage['gitRootDirectory']).toContain('che-plugin-registry');
  });

  test('no git repo', async () => {
    const git = sidecarDockerImage['git'];
    const spyRevparse = jest.spyOn(git, 'revparse');
    spyRevparse.mockImplementation(() => {
      throw new Error();
    });
    await sidecarDockerImage.init();
    expect(spyRevparse).toHaveBeenCalled();
    sidecarDockerImage['gitRootDirectory'] = undefined;
    await expect(sidecarDockerImage.getDockerImageFor('mycustom')).rejects.toThrow(
      'To use sidecar.directory attribute in the sidecar description, working directory should be a git repository.'
    );
  });

  test('exception if no-log', async () => {
    await sidecarDockerImage.init();
    const git = sidecarDockerImage['git'];
    const spyLog = jest.spyOn(git, 'log');
    const logResult = { all: [], total: 1, latest: null } as any;
    spyLog.mockResolvedValue(logResult);
    await expect(sidecarDockerImage.getDockerImageFor('unknown')).rejects.toThrow(
      'Unable to find result when executing'
    );
  });

  test('check hash', async () => {
    await sidecarDockerImage.init();
    const git = sidecarDockerImage['git'];
    const spyLog = jest.spyOn(git, 'log');
    const logResult = { all: [], total: 1, latest: { hash: 'b8f0528ec5026a175114506b7c41ce4a1c833196' } } as any;
    spyLog.mockResolvedValue(logResult);
    const result = await sidecarDockerImage.getDockerImageFor('mycustom');
    expect(result).toBe('quay.io/eclipse/che-plugin-sidecar:mycustom-b8f0528');
  });
});
