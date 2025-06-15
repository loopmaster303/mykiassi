if (!activeThread) {
  threadId = await createThread(currentInputMessage.trim());
  setInputMessage('');
  await waitForThread(threadId);
  await addMessage(threadId, { role: 'user', content: currentInputMessage.trim() });
}