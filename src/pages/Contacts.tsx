import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ContactFormDialog } from '@/components/ContactFormDialog';
import { useContacts, Contact } from '@/hooks/useContacts';
import { Plus, Users, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { SearchInput } from '@/components/SearchInput';
import { DataTableWrapper } from '@/components/DataTableWrapper';
import { useUserEntityPermissions } from '@/hooks/useUserEntityPermissions';
import { usePagination } from '@/hooks/usePagination';
import { DataPagination } from '@/components/DataPagination';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';

const Contacts = () => {
  const { hasPermission } = useUserEntityPermissions();
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);

  const { contacts, isLoading, createContact, updateContact, deleteContact } = useContacts(searchQuery);

  const {
    currentPage,
    setCurrentPage,
    paginatedItems,
    totalPages,
    totalItems,
    startIndex,
    endIndex,
  } = usePagination(contacts, 8);

  const handleCreateContact = async (data: any) => {
    await createContact.mutateAsync(data);
  };

  const handleUpdateContact = async (data: any) => {
    if (selectedContact) {
      await updateContact.mutateAsync({
        id: selectedContact.id,
        updates: data,
      });
    }
  };

  const handleEdit = (contact: Contact) => {
    setSelectedContact(contact);
    setIsFormOpen(true);
  };

  const handleDelete = (contact: Contact) => {
    setContactToDelete(contact);
  };

  const confirmDelete = async () => {
    if (contactToDelete) {
      await deleteContact.mutateAsync(contactToDelete.id);
      setContactToDelete(null);
    }
  };

  const handleNewContact = () => {
    setSelectedContact(null);
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader
        title="Contatos"
        description="Gerencie seus contatos e relacionamentos"
        action={
          hasPermission('contacts', 'create') && (
            <Button onClick={handleNewContact} className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Novo Contato
            </Button>
          )
        }
      />

      <SearchInput
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Buscar por nome, email ou empresa..."
      />

      {isLoading ? (
        <DataTableWrapper>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="hidden md:table-cell">Cargo</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="hidden sm:table-cell">Telefone</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-24 md:w-32" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28 md:w-40" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTableWrapper>
      ) : contacts.length === 0 ? (
        <EmptyState
          icon={Users}
          title={searchQuery ? 'Nenhum contato encontrado' : 'Nenhum contato cadastrado'}
          description={
            searchQuery
              ? 'Tente ajustar sua busca ou limpar os filtros'
              : 'Comece adicionando seu primeiro contato para gerenciar seus relacionamentos'
          }
          action={
            !searchQuery && hasPermission('contacts', 'create') && (
              <Button onClick={handleNewContact}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Primeiro Contato
              </Button>
            )
          }
        />
      ) : (
        <>
          <DataTableWrapper>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="hidden md:table-cell">Cargo</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="hidden sm:table-cell">Telefone</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell className="font-medium">
                      <div>
                        <span className="block">{contact.name}</span>
                        {/* Show position on mobile under name */}
                        <span className="block md:hidden text-xs text-muted-foreground">
                          {contact.position || ''}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{contact.position || '-'}</TableCell>
                    <TableCell className="max-w-[120px] md:max-w-none truncate">{contact.email || '-'}</TableCell>
                    <TableCell className="hidden sm:table-cell">{contact.phone || '-'}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-background">
                          {hasPermission('contacts', 'edit') && (
                            <DropdownMenuItem onClick={() => handleEdit(contact)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                          )}
                          {hasPermission('contacts', 'delete') && (
                            <DropdownMenuItem 
                              onClick={() => handleDelete(contact)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataTableWrapper>

          <DataPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            startIndex={startIndex}
            endIndex={endIndex}
            onPageChange={setCurrentPage}
          />
        </>
      )}

      {/* Form Dialog */}
      <ContactFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        contact={selectedContact}
        onSubmit={selectedContact ? handleUpdateContact : handleCreateContact}
        isSubmitting={createContact.isPending || updateContact.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDeleteDialog
        open={!!contactToDelete}
        onOpenChange={() => setContactToDelete(null)}
        onConfirm={confirmDelete}
        description={`Tem certeza que deseja excluir o contato "${contactToDelete?.name}"? Esta ação não pode ser desfeita.`}
        isLoading={deleteContact.isPending}
      />
    </div>
  );
};

export default Contacts;