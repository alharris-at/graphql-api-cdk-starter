import { useEffect, useState, ChangeEvent } from 'react';
import { API, Amplify } from 'aws-amplify';
import { GraphQLQuery, GraphQLSubscription, graphqlOperation } from '@aws-amplify/api';
import { Badge, Flex, Card, View, Collection, Button, Heading, TextField } from '@aws-amplify/ui-react';
import {
  CreateTodoMutation,
  DeleteTodoMutation,
  ListTodosQuery,
  OnCreateTodoSubscription,
  OnDeleteTodoSubscription,
  OnUpdateTodoSubscription,
  Todo,
  UpdateTodoMutation,
} from './API';
import { listTodos } from './graphql/queries';
import { createTodo, deleteTodo, updateTodo } from './graphql/mutations';
import { onCreateTodo, onUpdateTodo, onDeleteTodo } from './graphql/subscriptions';
import appConfig from './appConfig';

Amplify.configure(appConfig);

export const App = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [description, setDescription] = useState('');

  const refreshTodos = async () => {
    const returnedTodos = await API.graphql<GraphQLQuery<ListTodosQuery>>(graphqlOperation(listTodos));
    setTodos(returnedTodos.data?.listTodos?.items as any[]);
  };

  const deleteThisTodo = async (id: string) => {
    await API.graphql<GraphQLQuery<DeleteTodoMutation>>(graphqlOperation(deleteTodo, { input: { id } }));
    await refreshTodos();
  };

  const createNewTodo = async () => {
    if (description === '') return;
    await API.graphql<GraphQLQuery<CreateTodoMutation>>(graphqlOperation(createTodo, { input: { description } }));
    setDescription('');
    await refreshTodos();
  };

  const setCompleted = async (id: string, completed: boolean) => {
    await API.graphql<GraphQLQuery<UpdateTodoMutation>>(graphqlOperation(updateTodo, { input: { id, completed } }));
    await refreshTodos();
  };

  useEffect(() => {
    const refreshOnEvent = { next: () => refreshTodos() };
    const onCreate = API.graphql<GraphQLSubscription<OnCreateTodoSubscription>>(graphqlOperation(onCreateTodo)).subscribe(refreshOnEvent);
    const onUpdate = API.graphql<GraphQLSubscription<OnUpdateTodoSubscription>>(graphqlOperation(onUpdateTodo)).subscribe(refreshOnEvent);
    const onDelete = API.graphql<GraphQLSubscription<OnDeleteTodoSubscription>>(graphqlOperation(onDeleteTodo)).subscribe(refreshOnEvent);
    refreshTodos();
    return () => {
      onCreate.unsubscribe();
      onUpdate.unsubscribe();
      onDelete.unsubscribe();
    };
  }, []);

  return (
    <Flex direction='column'>
      <Heading level={3}>Todos</Heading>
      <Collection
        items={todos}
        type='list'
        direction='column'
        gap='20px'
        wrap='nowrap'
      >{((todo: Todo) => (
        <Card
          key={todo.id}
          borderRadius="medium"
          maxWidth="20rem"
          variation="outlined"
        >
          <View padding="xs">
            {todo.completed && (
              <div>
                <Badge content='Completed' size='small' variation='info'>Complete</Badge>
                <br />
                <br />
              </div>
            )}
            <Heading level={5} style={todo.completed ? {textDecoration: 'line-through'} : {}}>{todo.description}</Heading>
            <br />
            <Flex direction='row'>
              <Button variation='primary' size='small' onClick={() => setCompleted(todo.id, !todo.completed)} isFullWidth>
                {todo.completed ? 'Reopen' : 'Complete'}
              </Button>
              <Button variation='destructive' size='small' onClick={() => deleteThisTodo(todo.id)} isFullWidth>
                Discard
              </Button>
            </Flex>
          </View>
        </Card>
      ))}</Collection>
      <Heading level={3}>Add Todos</Heading>
      <Flex direction='row'>
        <TextField label="Action" placeholder="Give CDK Construct Demo" value={description} onChange={(event: ChangeEvent<HTMLInputElement>) => setDescription(event.target.value)} />
        <Button onClick={() => createNewTodo()}>Create</Button>
      </Flex>
    </Flex>
  );
};
