import NoSSRWrapper from "../components/home/NoSSRWrapper";
import Convert from "../components/home/Convert";

function Page() {
  return (
    <NoSSRWrapper>
      <Convert />
    </NoSSRWrapper>
  );
}

export default Page;
